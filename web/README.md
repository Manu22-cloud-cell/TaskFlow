# TaskFlow frontend

The TaskFlow frontend is a Next.js application that calls the NestJS API directly.
NestJS owns the HTTP-only access and refresh-token cookies; the frontend never stores tokens in local storage.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev -- -p 3001
```

Use the following local environment values:

```env
# Used by browser Axios requests.
NEXT_PUBLIC_TASKFLOW_API_URL=http://localhost:3000
```

The NestJS server must allow the frontend origin with credentials:

```env
CORS_ORIGIN=http://localhost:3001
```

## API architecture

```text
Client Components → services/client → clientApi → NestJS API
```

Browser Axios uses `withCredentials: true`, so the browser sends NestJS-issued HTTP-only cookies automatically. When an access token expires, the Axios interceptor calls `POST /auth/refresh` and retries the original request once.

For a direct navigation or reload after the access token expires, Next.js redirects through `/session/refresh`. That page refreshes cookies in the browser, then reloads the requested page. This keeps refresh-token rotation compatible with the client-only architecture.
