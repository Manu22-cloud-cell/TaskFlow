export function getAccessTokenFromCookies(response: {
  headers: { 'set-cookie'?: string[] };
}) {
  const accessCookie = response.headers['set-cookie']?.find((cookie) =>
    cookie.startsWith('taskflow_access_token='),
  );

  if (!accessCookie) throw new Error('Access-token cookie was not set');

  return accessCookie.split(';', 1)[0].split('=', 2)[1];
}

export function getRefreshTokenFromCookies(response: {
  headers: { 'set-cookie'?: string[] };
}) {
  const refreshCookie = response.headers['set-cookie']?.find((cookie) =>
    cookie.startsWith('taskflow_refresh_token='),
  );

  if (!refreshCookie) throw new Error('Refresh-token cookie was not set');

  return refreshCookie.split(';', 1)[0].split('=', 2)[1];
}
