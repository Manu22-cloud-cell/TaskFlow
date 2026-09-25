# TaskFlow

TaskFlow is a Jira-style collaborative task-management application. It has a NestJS, PostgreSQL, and Prisma API plus a Next.js frontend. It provides cookie-based JWT authentication, project-scoped permissions, a drag-and-drop task board, comments, activity history, realtime updates, and administration tools.

## Features

- User registration, login, access tokens, refresh-token rotation, and hashed passwords.
- Global roles: `ADMIN`, `MANAGER`, and `MEMBER`.
- Project ownership and project-scoped manager/member roles.
- Board tasks with status columns, zero-based positions, filtering, pagination, and atomic drag-and-drop moves.
- Assigned members can update the status of their own tasks.
- Task comments and an immutable activity feed.
- Socket.IO realtime updates for tasks, comments, project settings, and membership changes.
- An admin user-management screen for global role changes.
- Centralized REST error responses, safe structured request/error logging, DTO validation, Prisma migrations, unit tests, and E2E tests.

## Stack

| Technology               | Purpose                                                 |
| ------------------------ | ------------------------------------------------------- |
| NestJS / TypeScript      | REST API, WebSocket gateway, and modular backend        |
| Next.js / React          | Client-side application and task-board interface        |
| PostgreSQL               | Relational database                                     |
| Prisma 7                 | Typed database client and migrations                    |
| Socket.IO                | Realtime collaboration events                           |
| JWT / bcrypt             | HTTP-only cookie authentication and credential security |
| Axios                    | Browser API client with refresh-and-retry support       |
| class-validator          | Request validation                                      |
| Jest / Supertest         | Unit and end-to-end tests                               |
| Nginx + systemd (deploy) | HTTPS reverse proxy and production process management   |

## Setup

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL

Install dependencies and create a local environment file:

```bash
npm install
cp .env.example .env
```

Update the copied `.env` file with your local PostgreSQL credentials and JWT secrets:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/taskflow?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="replace-with-a-different-long-random-secret"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
CORS_ORIGIN="http://localhost:3001"
```

Generate Prisma types before applying migrations, then start the API:

```bash
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

The API runs at `http://localhost:3000`.

### Create the initial admin

Registration creates a global `MEMBER`. To create the first global `ADMIN`, run the seed command after `npm run build`. The values below are temporary shell variables and are not written to `.env`:

```bash
read -r -p "Admin email: " ADMIN_EMAIL
read -r -s -p "Admin password: " ADMIN_PASSWORD
echo

INITIAL_ADMIN_NAME="TaskFlow Admin" \
INITIAL_ADMIN_EMAIL="$ADMIN_EMAIL" \
INITIAL_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
npm run seed:admin

unset ADMIN_EMAIL ADMIN_PASSWORD
```

The script creates the user if it does not exist; if it already exists, it ensures that the user has the `ADMIN` role. Store the chosen password securely.

### Frontend setup

In a second terminal, create the frontend environment file and start Next.js:

```bash
cd web
npm install
cp .env.example .env.local
npm run dev -- -p 3001
```

`web/.env.local` must point to the NestJS API:

```env
NEXT_PUBLIC_TASKFLOW_API_URL=http://localhost:3000
```

Open `http://localhost:3001`. The backend must allow this browser origin:

```env
CORS_ORIGIN=http://localhost:3001
```

The frontend calls NestJS directly with Axios and `withCredentials: true`; it never stores access or refresh tokens in local storage.

## Commands

```bash
npm run build
npm run start:dev
npm run start:prod
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Frontend commands:

```bash
cd web
npm run dev -- -p 3001
npm run lint
npx tsc --noEmit
npm run build
```

## Architecture

The browser talks directly to the API. Backend features follow NestJS's controller → service → Prisma pattern:

```text
Next.js Client Components
  → services/client
  → Axios client (HTTP-only cookies + refresh/retry)
  → NestJS controller → guard → DTO validation → service → Prisma → PostgreSQL
```

Key modules:

```text
src/
├── auth/              JWT authentication and global-role guard
├── users/             User administration
├── projects/          Projects and shared ProjectAccessService
├── project-members/   Project membership and scoped roles
├── tasks/             Board queries, task movement, and task updates
├── comments/          Comments and task activity feed
├── realtime/          Socket.IO gateway and project/user rooms
├── common/            Global HTTP exception filter and request logger
└── prisma/            Global Prisma service

web/src/
├── app/               Next.js routes and layouts
├── features/          Reusable UI grouped by domain
├── services/client/   Feature-specific Axios API calls
├── lib/               Shared Axios client and TypeScript types
└── proxy.ts           Protected-route and refresh navigation handling
```

`ProjectAccessService` is the central authorization boundary. It checks whether a requester can view, manage, or delete a particular project; feature services reuse it rather than duplicating permission logic.

## Authorization model

TaskFlow has two role layers.

| Role layer           | Values                       | Purpose                         |
| -------------------- | ---------------------------- | ------------------------------- |
| Global `User.role`   | `ADMIN`, `MANAGER`, `MEMBER` | System-wide capabilities        |
| `ProjectMember.role` | `MANAGER`, `MEMBER`          | Capabilities inside one project |

Rules:

- An `ADMIN` can administer every project and may choose any valid project owner.
- A global `MANAGER` can create a project only for themselves.
- Creating a project automatically creates an owner membership with project role `MANAGER`.
- An owner or project manager can manage that project, its members, and its tasks.
- A project member can view its project, board, comments, and activity.
- An assigned project member can transition only their own task's status.
- Tasks can be assigned only to members of the task's project.

## Schema design

```text
User ──owns──────────< Project ──contains──────< Task
  │                       │                       ├──< Comment >── author: User
  │                       │                       └──< TaskActivity >── actor: User
  ├──assigned to─────────┘
  └──< ProjectMember >── Project
```

| Model           | Purpose                                                                           |
| --------------- | --------------------------------------------------------------------------------- |
| `User`          | Identity, global role, password hash, and refresh-token session state             |
| `Project`       | A project with an owner and lifecycle status                                      |
| `ProjectMember` | Unique `(projectId, userId)` membership with project role                         |
| `Task`          | Board work item with status, priority, optional assignee/due date, and `position` |
| `Comment`       | A task discussion entry with an author                                            |
| `TaskActivity`  | Immutable audit event with actor, type, and optional JSON metadata                |

`Task.position` is zero-based and indexed with `(projectId, status, position)`. It is maintained transactionally when tasks are created, moved, or status-transitioned.

## API overview

All protected endpoints require:

```http
HTTP-only `taskflow_access_token` cookies. Bearer tokens are also accepted for API tools such as Postman.
```

On login, NestJS sets a 15-minute access cookie and a 7-day refresh cookie. Axios calls `/auth/refresh` once and retries a failed request when an access token expires. Refresh tokens are rotated and their persisted hash is updated on the server.

### Authentication

| Method | Route            | Description                                    |
| ------ | ---------------- | ---------------------------------------------- |
| POST   | `/auth/register` | Register a member user                         |
| POST   | `/auth/login`    | Set HTTP-only access and refresh-token cookies |
| POST   | `/auth/refresh`  | Rotate the HTTP-only auth cookies              |
| GET    | `/auth/me`       | Return the currently authenticated user        |
| POST   | `/auth/logout`   | Revoke session and clear auth cookies          |

### Users

| Method       | Route        | Description                                         |
| ------------ | ------------ | --------------------------------------------------- |
| GET          | `/users`     | Search and paginate users (global admin or manager) |
| GET          | `/users/:id` | Read a user (global admin or manager)               |
| POST         | `/users`     | Create a user (global admin)                        |
| PATCH/DELETE | `/users/:id` | Update global role or delete a user (admin only)    |

### Projects and members

| Method           | Route                                  | Description                                      |
| ---------------- | -------------------------------------- | ------------------------------------------------ |
| GET              | `/projects`                            | Search, filter, and paginate visible projects    |
| POST             | `/projects`                            | Create project (admin or global manager)         |
| GET/PATCH/DELETE | `/projects/:id`                        | Read, manage, or delete subject to project scope |
| GET/POST         | `/projects/:projectId/members`         | List or add project members                      |
| PATCH/DELETE     | `/projects/:projectId/members/:userId` | Change a member role or remove a member          |

### Tasks and board

| Method           | Route                        | Description                                                        |
| ---------------- | ---------------------------- | ------------------------------------------------------------------ |
| GET/POST         | `/tasks`                     | List accessible tasks or create a task                             |
| GET/PATCH/DELETE | `/tasks/:id`                 | Read, edit, or delete a task                                       |
| PATCH            | `/tasks/:id/move`            | Move a task to a status/position; manager scope required           |
| PATCH            | `/tasks/:id/status`          | Transition task status; assigned members may update their own task |
| GET              | `/projects/:projectId/tasks` | Board query with filters and pagination                            |

Board query parameters: `status`, `assignedToId`, `priority`, `dueDate`, `page`, and `limit` (maximum `100`).

```http
GET /projects/12/tasks?status=TODO&page=1&limit=50
```

Project and user list queries use offset pagination. `GET /projects` accepts `search`, `status`, `page`, and `limit`; `GET /users` accepts `search`, `page`, and `limit`. Both return:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 0,
    "totalPages": 0
  }
}
```

The project-owner and member pickers use the paginated user search endpoint as a typeahead, requesting up to ten matching users instead of loading every user into the page.

Move request:

```json
{ "status": "IN_PROGRESS", "position": 0 }
```

### Comments and activity

| Method       | Route                                | Description                     |
| ------------ | ------------------------------------ | ------------------------------- |
| GET/POST     | `/tasks/:taskId/comments`            | List or add comments            |
| PATCH/DELETE | `/tasks/:taskId/comments/:commentId` | Edit or remove a comment        |
| GET          | `/tasks/:taskId/activity`            | Read newest-first activity feed |

Activity currently records task creation, status changes, assignee changes, priority changes, due-date changes, and comments.

Comments and activity use cursor pagination to prevent long task histories from loading in a single request. Both endpoints accept an optional `cursor` (the final item ID from the previous page) and `limit` (default `20`, maximum `50`):

```http
GET /tasks/12/activity?limit=20
GET /tasks/12/comments?cursor=84&limit=20
```

They return a consistent page shape:

```json
{
  "data": [],
  "meta": {
    "limit": 20,
    "nextCursor": 84,
    "hasNextPage": true
  }
}
```

## Realtime collaboration

The API exposes the Socket.IO namespace `/realtime`. Once authenticated, a browser joins the active project room and receives task, comment, project, and membership events. The frontend reloads the affected client-side data and shows a small notification for changes made by another user.

Events include:

```text
task.created | task.updated | task.moved | task.deleted
comment.created | comment.updated | comment.deleted
project.updated | project.deleted
project.member.added | project.member.updated | project.member.removed
```

## Error handling and observability

Services throw NestJS exceptions such as `NotFoundException`, `ForbiddenException`, and `ConflictException`. A global exception filter converts all REST failures into a consistent response:

```json
{
  "statusCode": 404,
  "message": "Task not found",
  "error": "Not Found",
  "timestamp": "2026-09-21T10:00:00.000Z",
  "path": "/tasks/12",
  "requestId": "8eab3d4d-..."
}
```

Every HTTP response includes an `X-Request-Id` header. The request logger writes structured JSON with the method, path, response status, duration, request ID, and authenticated user ID when available. It intentionally excludes request bodies, query strings, cookies, authorization headers, and tokens. Unexpected errors are logged on the server; clients receive only the safe `500 Internal server error` message.

## Database migrations

The schema is defined in `prisma/schema.prisma`; committed migrations are in `prisma/migrations/`. Use `npx prisma migrate deploy` for an existing database. Use `npx prisma migrate dev --name <name>` during local schema development.

## Testing

Unit tests mock Prisma and cover services, controllers, guards, and project access rules. E2E tests use the configured PostgreSQL database and cover auth, projects, membership, and board task flow.

## Production deployment notes

For production, deploy the frontend and API behind HTTPS. The auth cookies are marked `Secure` when `NODE_ENV=production`, so login will not work over plain HTTP.

Recommended topology:

```text
Browser
  → https://app.example.com  → Nginx → Next.js (localhost:3001)
  → https://api.example.com  → Nginx → NestJS + Socket.IO (localhost:3000)
                                             → PostgreSQL
```

Set the production environment values before building:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/taskflow?schema=public"
JWT_SECRET="long-random-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="different-long-random-secret"
JWT_REFRESH_EXPIRES_IN="7d"
CORS_ORIGIN="https://app.example.com"
COOKIE_DOMAIN=".example.com"
COOKIE_SAME_SITE="lax"
```

For the frontend build, set:

```env
NEXT_PUBLIC_TASKFLOW_API_URL=https://api.example.com
NEXT_PUBLIC_TASKFLOW_SOCKET_URL=https://api.example.com
```

### Render + Vercel learning deployment without a custom domain

The default `onrender.com` API URL and `vercel.app` frontend URL are different sites. For this learning-only topology, configure the API with the exact Vercel production URL and cross-site cookies:

```env
CORS_ORIGIN="https://your-project.vercel.app"
COOKIE_DOMAIN=""
COOKIE_SAME_SITE="none"
```

Set this Vercel environment variable for the same deployment:

```env
DISABLE_PROXY_AUTH="true"
```

The browser-side Axios client continues to validate and refresh sessions. Some browsers block third-party cookies, so use a shared custom domain for a production deployment.

Do not expose NestJS (`3000`), Next.js (`3001`), or PostgreSQL (`5432`) directly to the internet. Expose only Nginx on ports `80` and `443`; use a process manager such as `systemd` for both Node.js applications.
