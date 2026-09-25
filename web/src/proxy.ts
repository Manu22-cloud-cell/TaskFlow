import { NextResponse, type NextRequest } from 'next/server';
const ACCESS_TOKEN_COOKIE = 'taskflow_access_token';
const REFRESH_TOKEN_COOKIE = 'taskflow_refresh_token';

export function proxy(request: NextRequest) {
  // API cookies are unavailable to this edge proxy when Vercel and Render
  // use their separate default domains. Axios handles browser-side refresh.
  if (process.env.DISABLE_PROXY_AUTH === 'true') {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken && !accessToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (refreshToken && isAccessTokenExpired(accessToken)) {
    const refreshUrl = new URL('/session/refresh', request.url);
    const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;

    refreshUrl.searchParams.set('returnTo', returnTo);

    return NextResponse.redirect(refreshUrl);
  }

  return NextResponse.next();
}

function isAccessTokenExpired(token: string | undefined) {
  if (!token) return true;

  try {
    const encodedPayload = token
      .split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const paddedPayload = encodedPayload.padEnd(
      encodedPayload.length + ((4 - (encodedPayload.length % 4)) % 4),
      '=',
    );
    const payload = JSON.parse(atob(paddedPayload)) as { exp?: number };

    return !payload.exp || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export const config = {
  matcher: ['/projects/:path*', '/tasks/:path*', '/admin/:path*'],
};
