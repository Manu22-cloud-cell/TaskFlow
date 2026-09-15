import { NextRequest, NextResponse } from 'next/server';

import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  context: RouteContext<'/api/projects/[projectId]/members/[userId]'>,
) {
  const { projectId, userId } = await context.params;

  return forwardMemberRequest(
    request,
    projectId,
    userId,
    'PATCH',
    await request.json(),
  );
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<'/api/projects/[projectId]/members/[userId]'>,
) {
  const { projectId, userId } = await context.params;

  return forwardMemberRequest(request, projectId, userId, 'DELETE');
}

async function forwardMemberRequest(
  request: NextRequest,
  projectId: string,
  userId: string,
  method: 'PATCH' | 'DELETE',
  body?: unknown,
) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json(
      { message: 'Access token is required' },
      { status: 401 },
    );
  }

  const response = await fetch(
    `${process.env.TASKFLOW_API_URL}/projects/${projectId}/members/${userId}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const data = await response.json();

  return NextResponse.json(data, { status: response.status });
}
