import { NextRequest, NextResponse } from 'next/server';

import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  context: RouteContext<'/api/projects/[projectId]/members'>,
) {
  const { projectId } = await context.params;
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json(
      { message: 'Access token is required' },
      { status: 401 },
    );
  }

  const response = await fetch(
    `${process.env.TASKFLOW_API_URL}/projects/${projectId}/members`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(await request.json()),
    },
  );
  const data = await response.json();

  return NextResponse.json(data, { status: response.status });
}
