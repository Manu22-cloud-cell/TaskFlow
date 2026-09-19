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
# Used by Server Components when they call NestJS.
TASKFLOW_API_URL=http://localhost:3000

# Exposed to browser Axios requests.
NEXT_PUBLIC_TASKFLOW_API_URL=http://localhost:3000
```

The NestJS server must allow the frontend origin with credentials:

```env
CORS_ORIGIN=http://localhost:3001
```

## API architecture

```text
Server Components → server Axios helper → NestJS API
Client Components → browser Axios helper → NestJS API
```

Browser Axios uses `withCredentials: true`, so the browser sends NestJS-issued HTTP-only cookies automatically. When an access token expires, the Axios interceptor calls `POST /auth/refresh` and retries the original request once.
