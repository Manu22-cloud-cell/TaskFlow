import { NextResponse } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  tokenCookieOptions,
} from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json();
  const response = await fetch(`${process.env.TASKFLOW_API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
