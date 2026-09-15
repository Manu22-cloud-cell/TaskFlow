import { NextResponse, type NextRequest } from 'next/server';
const ACCESS_TOKEN_COOKIE = 'taskflow_access_token';
const REFRESH_TOKEN_COOKIE = 'taskflow_refresh_token';

export function proxy(request: NextRequest) {
  if (
    !request.cookies.has(ACCESS_TOKEN_COOKIE) &&
    !request.cookies.has(REFRESH_TOKEN_COOKIE)
  ) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/projects/:path*'] };
