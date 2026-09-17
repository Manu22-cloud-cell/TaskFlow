import { NextRequest, NextResponse } from 'next/server';

import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  context: RouteContext<'/api/projects/[projectId]'>,
) {
  const { projectId } = await context.params;

  return forwardProjectRequest(
    request,
    projectId,
    'PATCH',
    await request.json(),
  );
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<'/api/projects/[projectId]'>,
) {
  const { projectId } = await context.params;

  return forwardProjectRequest(request, projectId, 'DELETE');
}

async function forwardProjectRequest(
  request: NextRequest,
  projectId: string,
  method: 'PATCH' | 'DELETE',
  body?: unknown,
) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { message: 'Access token is required' },
      { status: 401 },
    );
  }

  const response = await fetch(
    `${process.env.TASKFLOW_API_URL}/projects/${projectId}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );

  return NextResponse.json(await response.json(), { status: response.status });
}
