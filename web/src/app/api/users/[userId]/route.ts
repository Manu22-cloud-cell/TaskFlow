import { NextRequest, NextResponse } from 'next/server';

import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  context: RouteContext<'/api/users/[userId]'>,
) {
  const { userId } = await context.params;
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { message: 'Access token is required' },
      { status: 401 },
    );
  }

  const response = await fetch(
    `${process.env.TASKFLOW_API_URL}/users/${userId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(await request.json()),
    },
  );

  return NextResponse.json(await response.json(), { status: response.status });
}
