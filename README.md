# TaskFlow

TaskFlow is a Jira-style task-management backend built with NestJS, PostgreSQL, and Prisma. It provides JWT authentication, project-scoped permissions, board-ready tasks, comments, and an activity feed. A frontend has not yet been added.

## Features

- User registration, login, access tokens, refresh-token rotation, and hashed passwords.
- Global roles: `ADMIN`, `MANAGER`, and `MEMBER`.
- Project ownership and project-scoped manager/member roles.
- Board tasks with status columns, zero-based positions, filtering, pagination, and atomic drag-and-drop moves.
- Assigned members can update the status of their own tasks.
- Task comments and an immutable activity feed.
- DTO validation, Prisma migrations, unit tests, and E2E tests.

## Stack

| Technology | Purpose |
| --- | --- |
| NestJS / TypeScript | HTTP API and modular application structure |
| PostgreSQL | Relational database |
| Prisma 7 | Typed database client and migrations |
| JWT / bcrypt | Authentication and credential security |
| class-validator | Request validation |
| Jest / Supertest | Unit and end-to-end tests |

## Setup

### Prerequisites

- Node.js and npm
- PostgreSQL

Install dependencies and create a local environment file:

```bash
npm install
```

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/taskflow?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="replace-with-a-different-long-random-secret"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
```

Apply migrations, generate Prisma types, and start the API:

```bash
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

The API runs at `http://localhost:3000`.

## Commands

```bash
npm run build
npm run start:dev
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

## Architecture

Each feature follows NestJS's controller → service → Prisma pattern:

```text
HTTP request → JWT guard → DTO validation → controller → service → Prisma → PostgreSQL
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
└── prisma/            Global Prisma service
```

`ProjectAccessService` is the central authorization boundary. It checks whether a requester can view, manage, or delete a particular project; feature services reuse it rather than duplicating permission logic.

## Authorization model

TaskFlow has two role layers.

| Role layer | Values | Purpose |
| --- | --- | --- |
| Global `User.role` | `ADMIN`, `MANAGER`, `MEMBER` | System-wide capabilities |
| `ProjectMember.role` | `MANAGER`, `MEMBER` | Capabilities inside one project |

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

| Model | Purpose |
| --- | --- |
| `User` | Identity, global role, password hash, and refresh-token session state |
| `Project` | A project with an owner and lifecycle status |
| `ProjectMember` | Unique `(projectId, userId)` membership with project role |
| `Task` | Board work item with status, priority, optional assignee/due date, and `position` |
| `Comment` | A task discussion entry with an author |
| `TaskActivity` | Immutable audit event with actor, type, and optional JSON metadata |

`Task.position` is zero-based and indexed with `(projectId, status, position)`. It is maintained transactionally when tasks are created, moved, or status-transitioned.

## API overview

All protected endpoints require:

```http
Authorization: Bearer <accessToken>
```

### Authentication

| Method | Route | Description |
| --- | --- | --- |
| POST | `/auth/register` | Register a member user |
| POST | `/auth/login` | Receive access and refresh tokens |
| POST | `/auth/refresh` | Rotate refresh token and receive new tokens |

### Projects and members

| Method | Route | Description |
| --- | --- | --- |
| GET | `/projects` | List projects visible to requester |
| POST | `/projects` | Create project (admin or global manager) |
| GET/PATCH/DELETE | `/projects/:id` | Read, manage, or delete subject to project scope |
| GET/POST | `/projects/:projectId/members` | List or add project members |
| PATCH/DELETE | `/projects/:projectId/members/:userId` | Change a member role or remove a member |

### Tasks and board

| Method | Route | Description |
| --- | --- | --- |
| GET/POST | `/tasks` | List accessible tasks or create a task |
| GET/PATCH/DELETE | `/tasks/:id` | Read, edit, or delete a task |
| PATCH | `/tasks/:id/move` | Move a task to a status/position; manager scope required |
| PATCH | `/tasks/:id/status` | Transition task status; assigned members may update their own task |
| GET | `/projects/:projectId/tasks` | Board query with filters and pagination |

Board query parameters: `status`, `assignedToId`, `priority`, `dueDate`, `page`, and `limit` (maximum `100`).

```http
GET /projects/12/tasks?status=TODO&page=1&limit=50
```

Move request:

```json
{ "status": "IN_PROGRESS", "position": 0 }
```

### Comments and activity

| Method | Route | Description |
| --- | --- | --- |
| GET/POST | `/tasks/:taskId/comments` | List or add comments |
| PATCH/DELETE | `/tasks/:taskId/comments/:commentId` | Edit or remove a comment |
| GET | `/tasks/:taskId/activity` | Read newest-first activity feed |

Activity currently records task creation, status changes, assignee changes, priority changes, due-date changes, and comments.

## Database migrations

The schema is defined in `prisma/schema.prisma`; committed migrations are in `prisma/migrations/`. Use `npx prisma migrate deploy` for an existing database. Use `npx prisma migrate dev --name <name>` during local schema development.

## Testing

Unit tests mock Prisma and cover services, controllers, guards, and project access rules. E2E tests use the configured PostgreSQL database and cover auth, projects, membership, and board task flow.
