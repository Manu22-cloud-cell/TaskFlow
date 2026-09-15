import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  tokenCookieOptions,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken)
    return NextResponse.json(
      { message: 'Refresh token is required' },
      { status: 401 },
    );
  const response = await fetch(`${process.env.TASKFLOW_API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await response.json();
  if (!response.ok) return NextResponse.json(data, { status: response.status });
  const result = NextResponse.json({ user: data.user });
  result.cookies.set(
    ACCESS_TOKEN_COOKIE,
    data.accessToken,
    tokenCookieOptions(15 * 60),
  );
  result.cookies.set(
    REFRESH_TOKEN_COOKIE,
    data.refreshToken,
    tokenCookieOptions(7 * 24 * 60 * 60),
  );
  return result;
}
