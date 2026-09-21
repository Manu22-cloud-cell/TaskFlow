import type { CookieOptions, Request, Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'taskflow_access_token';
export const REFRESH_TOKEN_COOKIE = 'taskflow_refresh_token';

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  };
}

export function setAuthCookies(
  response: Response,
  tokens: { accessToken: string; refreshToken: string },
) {
  response.cookie(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    cookieOptions(ACCESS_TOKEN_MAX_AGE_MS),
  );
  response.cookie(
    REFRESH_TOKEN_COOKIE,
    tokens.refreshToken,
    cookieOptions(REFRESH_TOKEN_MAX_AGE_MS),
  );
}

export function clearAuthCookies(response: Response) {
  response.clearCookie(ACCESS_TOKEN_COOKIE, cookieOptions(0));
  response.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions(0));
}

export function getCookie(request: Request, name: string) {
  return getCookieFromHeader(request.headers.cookie, name);
}

export function getCookieFromHeader(
  cookieHeader: string | undefined,
  name: string,
) {
  if (!cookieHeader) return undefined;

  const cookie = cookieHeader
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
}
