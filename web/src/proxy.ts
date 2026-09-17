import { NextResponse, type NextRequest } from 'next/server';
const ACCESS_TOKEN_COOKIE = 'taskflow_access_token';
const REFRESH_TOKEN_COOKIE = 'taskflow_refresh_token';

export function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ['/projects/:path*'] };
