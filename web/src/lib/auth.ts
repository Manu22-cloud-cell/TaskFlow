import { cookies } from 'next/headers';

export const ACCESS_TOKEN_COOKIE = 'taskflow_access_token';
export const REFRESH_TOKEN_COOKIE = 'taskflow_refresh_token';

const options = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export function tokenCookieOptions(maxAge: number) {
  return { ...options, maxAge };
}

export async function getAccessToken() {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
}
