# TaskFlow Development Guide

## 1. Project Overview

TaskFlow is a backend task management application built with **NestJS, TypeScript, PostgreSQL, and Prisma**.

The application provides APIs to manage:

* **Users** — application users who can own projects and be assigned tasks.
* **Projects** — projects owned by users and containing multiple tasks.
* **Tasks** — work items belonging to projects and optionally assigned to users.

### Core Relationships

```text
User
 ├── owns ──> Projects
 └── assigned to ──> Tasks

Project
 └── contains ──> Tasks
```

The project follows a modular backend architecture, where each major domain is organized into its own NestJS module.

---

## 2. Tech Stack

| Technology            | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| **Node.js**           | JavaScript runtime                             |
| **TypeScript**        | Type-safe application development              |
| **NestJS**            | Backend framework and application architecture |
| **PostgreSQL**        | Relational database                            |
| **Prisma**            | ORM and database access                        |
| **Jest**              | Unit testing                                   |
| **class-validator**   | Request DTO validation                         |
| **class-transformer** | Transformation of incoming request data        |

### Why These Technologies?

* **NestJS** provides a structured architecture based on modules, controllers, and services.
* **PostgreSQL** provides reliable relational data storage and supports the relationships required by TaskFlow.
* **Prisma** provides type-safe database queries, schema management, and migrations.
* **Jest** is used for unit testing the service layer with mocked Prisma dependencies.
* **class-validator** and **class-transformer** provide request validation through DTOs.

---

## 3. Project Setup

### Prerequisites

Install the following before setting up the project:

* Node.js
* npm
* PostgreSQL
* NestJS CLI

Verify the installations:

```bash
node --version
npm --version
psql --version
nest --version
```

### Create the NestJS Project

Install the NestJS CLI:

```bash
npm install -g @nestjs/cli
```

Create the project:

```bash
nest new taskflow
```

Move into the project directory:

```bash
cd taskflow
```

### Install Application Dependencies

Install configuration and request-validation packages:

```bash
npm install @nestjs/config class-validator class-transformer
```

Install Prisma and PostgreSQL dependencies:

```bash
npm install prisma @prisma/client @prisma/adapter-pg pg
```

Install Jest testing dependencies:

```bash
npm install -D jest ts-jest @types/jest
```

### Run the Application

Start the application in development mode:

```bash
npm run start:dev
```

The API is available at:

```text
http://localhost:3000
```

### Project Structure

The main application structure is organized as follows:

```text
taskflow/
├── docs/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── prisma/
│   ├── users/
│   ├── projects/
│   ├── tasks/
│   ├── app.module.ts
│   └── main.ts
├── .env
├── package.json
├── tsconfig.json
└── jest.config.ts
```

The `src/` directory contains the application modules, while `prisma/` contains the database schema and migration history.

The `.env` file contains local environment configuration and is not committed to the repository.

## 4. NestJS Architecture

TaskFlow uses the standard **NestJS modular architecture**.

NestJS organizes the application into three primary building blocks:

```text
Module
  │
  ├── Controller  → Handles HTTP requests
  │
  └── Service     → Contains business logic
```

### Modules

A module groups related functionality into a single feature boundary.

TaskFlow currently contains:

```text
src/
├── users/
│   └── UsersModule
├── projects/
│   └── ProjectsModule
├── tasks/
│   └── TasksModule
└── prisma/
    └── PrismaModule
```

For example, the `TasksModule` contains all functionality related to tasks:

```text
tasks/
├── dto/
│   ├── create-task.dto.ts
│   └── update-task.dto.ts
├── tasks.controller.ts
├── tasks.service.ts
├── tasks.controller.spec.ts
├── tasks.service.spec.ts
└── tasks.module.ts
```

### Controllers

Controllers are responsible for handling HTTP requests and mapping them to service methods.

For example:

```text
POST   /tasks       → create()
GET    /tasks       → findAll()
GET    /tasks/:id   → findOne()
PATCH  /tasks/:id   → update()
DELETE /tasks/:id   → remove()
```

The controller should remain lightweight and delegate business logic to the service.

### Services

Services contain the application's business logic.

For example, `TasksService` is responsible for:

* Validating that a project exists before creating a task.
* Validating an assigned user when one is provided.
* Fetching tasks with their project and assignee information.
* Updating task information.
* Deleting tasks.
* Handling `NotFoundException` cases.

The service communicates with PostgreSQL through `PrismaService`.

```text
HTTP Request
     │
     ▼
Controller
     │
     ▼
Service
     │
     ▼
PrismaService
     │
     ▼
PostgreSQL
```

### DTOs and Validation

TaskFlow uses **Data Transfer Objects (DTOs)** to define and validate incoming request data.

For example, `CreateTaskDto` validates:

* `title`
* `description`
* `status`
* `priority`
* `dueDate`
* `projectId`
* `assignedToId`

Validation is enabled globally in `main.ts`:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
);
```

This provides two important protections:

* `whitelist: true` removes properties that are not defined in the DTO.
* `forbidNonWhitelisted: true` rejects requests containing unexpected properties.

### Prisma Module

`PrismaModule` provides a centralized `PrismaService` to the application.

It is registered as a global module:

```typescript
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

This allows feature services such as `UsersService`, `ProjectsService`, and `TasksService` to use the same Prisma database client.

### Testing

The service layer is tested independently using **Jest**.

Prisma is mocked during unit tests so that tests do not require a real database connection.

```text
TasksService
     │
     └── Mock PrismaService
              │
              ├── findUnique()
              ├── findMany()
              ├── create()
              ├── update()
              └── delete()
```

This keeps service tests fast, isolated, and focused on business logic.

## 5. Local PostgreSQL Setup

TaskFlow uses **PostgreSQL** as its relational database.

For local development, PostgreSQL is installed and managed directly on macOS using **Homebrew**. Docker is not required for the current development setup.

### Install PostgreSQL

Install PostgreSQL using Homebrew:

```bash
brew install postgresql@17
```

Verify the installation:

```bash
psql --version
```

Example:

```text
psql (PostgreSQL) 17.x
```

### Start PostgreSQL

Start the PostgreSQL service using Homebrew:

```bash
brew services start postgresql@17
```

Check the service status:

```bash
brew services list
```

PostgreSQL should show as running.

### Create the TaskFlow Database

Connect to PostgreSQL:

```bash
psql postgres
```

Create the application database:

```sql
CREATE DATABASE taskflow;
```

Verify the database:

```sql
\l
```

Connect to the TaskFlow database:

```sql
\c taskflow
```

### Database Configuration

TaskFlow uses environment variables for database configuration.

Create a `.env` file in the project root:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_postgresql_username
DB_PASSWORD=your_postgresql_password
DB_NAME=taskflow

DATABASE_URL="postgresql://your_postgresql_username:your_postgresql_password@localhost:5432/taskflow"
```

If PostgreSQL is configured for local peer/trust authentication and no password is required, the connection string can omit the password:

```env
DATABASE_URL="postgresql://your_postgresql_username@localhost:5432/taskflow"
```

> **Note:** `.env` contains environment-specific configuration and must not be committed to Git.

### Verify the Database Connection

Connect directly using `psql`:

```bash
psql -d taskflow
```

Then verify the current database:

```sql
SELECT current_database();
```

Expected result:

```text
 taskflow
```

### PostgreSQL Role

The PostgreSQL role used by TaskFlow must have permission to connect to the `taskflow` database and create/modify tables.

Check the current PostgreSQL user:

```sql
SELECT current_user;
```

### Database Migrations

The database schema is managed through **Prisma migrations** rather than manually creating application tables.

After configuring PostgreSQL and Prisma, migrations can be applied using:

```bash
npx prisma migrate dev
```

Check migration status with:

```bash
npx prisma migrate status
```

A successful setup should report that the database schema is up to date.

### Local Database Architecture

The local development setup is:

```text
TaskFlow Application
        │
        │ DATABASE_URL
        ▼
   PostgreSQL
   localhost:5432
        │
        ▼
     taskflow
      database
```

The application communicates with PostgreSQL through **Prisma**, which is configured to use the PostgreSQL driver adapter.

```text
NestJS
   │
   ▼
PrismaService
   │
   ▼
Prisma Client
   │
   ▼
PostgreSQL
```

## 6. Prisma Setup

TaskFlow uses **Prisma** as the ORM for communicating with PostgreSQL.

Prisma provides:

* Type-safe database queries
* Database schema definition
* Database migrations
* Generated Prisma Client
* Strong integration with TypeScript

TaskFlow uses **Prisma 7** with the PostgreSQL driver adapter.

### Install Prisma

Install Prisma and the required PostgreSQL dependencies:

```bash
npm install prisma @prisma/client @prisma/adapter-pg pg
```

Verify the Prisma CLI:

```bash
npx prisma --version
```

### Initialize Prisma

Initialize Prisma in the project:

```bash
npx prisma init
```

This creates the Prisma configuration and schema files.

The relevant structure is:

```text
taskflow/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── prisma.config.ts
└── src/
    └── prisma/
        ├── prisma.module.ts
        └── prisma.service.ts
```

### Prisma Configuration

TaskFlow uses `prisma.config.ts` to configure the Prisma CLI:

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

The database connection string is loaded from the `.env` file.

### Define the Database Schema

The Prisma schema is maintained in:

```text
prisma/schema.prisma
```

The schema defines the application's models, fields, relationships, enums, and database constraints.

TaskFlow contains three primary models:

```text
User
Project
Task
```

The relationships are:

```text
User
 │
 ├── owns ──────────> Project
 │                       │
 │                       └── contains ──> Task
 │
 └── assigned to ──────────────────────> Task
```

### Prisma Generator

TaskFlow uses the Prisma Client generator with a custom output directory:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

Running:

```bash
npx prisma generate
```

generates the Prisma Client inside:

```text
src/generated/prisma/
```

The generated directory is excluded from Git because it is generated from the Prisma schema.

### Database Migrations

Prisma migrations are used to keep the PostgreSQL database schema synchronized with the application's Prisma schema.

Create and apply a migration during development:

```bash
npx prisma migrate dev --name <migration-name>
```

For example:

```bash
npx prisma migrate dev --name add_projects_and_tasks
```

Migration files are stored under:

```text
prisma/migrations/
```

Check the current migration status:

```bash
npx prisma migrate status
```

The database should report that the schema is up to date.

### Prisma Client and PostgreSQL Adapter

Prisma 7 uses a driver adapter for direct database connections.

TaskFlow uses:

```text
@prisma/adapter-pg
```

The `PrismaService` creates a PostgreSQL adapter using the `DATABASE_URL` environment variable:

```typescript
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### Prisma Module

`PrismaService` is registered through a global NestJS module:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

Because the module is global, feature modules can inject `PrismaService` without importing `PrismaModule` individually.

For example:

```typescript
@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}
}
```

### Database Query Flow

Application database operations follow this flow:

```text
HTTP Request
     │
     ▼
NestJS Controller
     │
     ▼
NestJS Service
     │
     ▼
PrismaService
     │
     ▼
Prisma Client
     │
     ▼
PostgreSQL
```

For example, creating a task:

```text
POST /tasks
      │
      ▼
TasksController
      │
      ▼
TasksService.create()
      │
      ├── Verify Project
      │
      ├── Verify Assignee (if provided)
      │
      ▼
PrismaService
      │
      ▼
prisma.task.create()
      │
      ▼
PostgreSQL
```

### Common Prisma Commands

| Command                     | Purpose                                  |
| --------------------------- | ---------------------------------------- |
| `npx prisma generate`       | Generate Prisma Client                   |
| `npx prisma migrate dev`    | Create and apply a development migration |
| `npx prisma migrate status` | Check migration status                   |
| `npx prisma studio`         | Open Prisma database GUI                 |
| `npx prisma format`         | Format the Prisma schema                 |

### Prisma Development Workflow

When making a database model change:

```text
1. Update prisma/schema.prisma
          │
          ▼
2. Run prisma format
          │
          ▼
3. Create migration
          │
          ▼
4. Run prisma generate
          │
          ▼
5. Update application code
          │
          ▼
6. Run tests
          │
          ▼
7. Run application/build
```

This keeps the **database schema, migration history, generated Prisma Client, and application code** synchronized.

## 7. TaskFlow ERD and Database Design

TaskFlow uses a relational database design with three core entities:

* **User**
* **Project**
* **Task**

The database is designed around the following relationships:

```text
User
 │
 ├─────────────── owns ────────────────> Project
 │                                        │
 │                                        │ contains
 │                                        ▼
 └──────────── assigned to ───────────> Task
                                         
Project ───────────── contains ────────> Task
```

### 7.1 Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ PROJECT : owns
    USER ||--o{ TASK : assigned_to
    PROJECT ||--o{ TASK : contains

    USER {
        int id PK
        string name
        string email UK
        string password
        datetime createdAt
        datetime updatedAt
    }

    PROJECT {
        int id PK
        string name
        string description
        ProjectStatus status
        int ownerId FK
        datetime createdAt
        datetime updatedAt
    }

    TASK {
        int id PK
        string title
        string description
        TaskStatus status
        TaskPriority priority
        datetime dueDate
        int projectId FK
        int assignedToId FK
        datetime createdAt
        datetime updatedAt
    }
```

### 7.2 User

The `User` entity represents users of the TaskFlow application.

```text
User
├── id
├── name
├── email
├── password
├── createdAt
└── updatedAt
```

#### Relationships

A user can:

* Own multiple projects.
* Be assigned multiple tasks.

```text
User 1 ──────── N Project
User 1 ──────── N Task
```

The user's password is stored as a **hashed value** and is never returned in API responses.

---

### 7.3 Project

The `Project` entity represents a project managed within TaskFlow.

```text
Project
├── id
├── name
├── description
├── status
├── ownerId
├── createdAt
└── updatedAt
```

`ownerId` is a foreign key referencing `User.id`.

```text
Project.ownerId → User.id
```

Each project must have an owner.

A project can contain multiple tasks:

```text
Project 1 ──────── N Task
```

#### Project Status

Projects can have one of the following statuses:

```text
PLANNING
ACTIVE
COMPLETED
ARCHIVED
```

---

### 7.4 Task

The `Task` entity represents an individual piece of work within a project.

```text
Task
├── id
├── title
├── description
├── status
├── priority
├── dueDate
├── projectId
├── assignedToId
├── createdAt
└── updatedAt
```

#### Project Relationship

Every task belongs to exactly one project.

```text
Task.projectId → Project.id
```

Therefore:

```text
Project 1 ──────── N Task
```

A project can contain many tasks, while a task cannot exist without a project.

#### User Assignment

A task can optionally be assigned to a user.

```text
Task.assignedToId → User.id
```

The relationship is optional because tasks can exist without being assigned to anyone.

```text
User 1 ──────── N Task
               │
               └── assignedToId is optional
```

This allows TaskFlow to support both:

```text
Assigned Task
Task → User

Unassigned Task
Task → null
```

### 7.5 Task Status

Tasks use the following statuses:

```text
TODO
IN_PROGRESS
COMPLETED
CANCELLED
```

This provides a simple task lifecycle:

```text
TODO
  │
  ▼
IN_PROGRESS
  │
  ├──> COMPLETED
  │
  └──> CANCELLED
```

### 7.6 Task Priority

Tasks have three priority levels:

```text
LOW
MEDIUM
HIGH
```

The default priority is:

```text
MEDIUM
```

### 7.7 Cardinality

The relationships can be summarized as follows:

| Relationship   | Cardinality | Description                                   |
| -------------- | ----------- | --------------------------------------------- |
| User → Project | 1:N         | A user can own multiple projects              |
| User → Task    | 1:N         | A user can be assigned multiple tasks         |
| Project → Task | 1:N         | A project can contain multiple tasks          |
| Task → Project | N:1         | Every task belongs to one project             |
| Task → User    | N:0..1      | A task may optionally be assigned to one user |

### 7.8 Foreign Keys

TaskFlow uses foreign keys to maintain referential integrity.

```text
Project.ownerId
      │
      ▼
User.id
```

```text
Task.projectId
      │
      ▼
Project.id
```

```text
Task.assignedToId
      │
      ▼
User.id
```

This prevents tasks or projects from referencing non-existent parent records at the database level.

The application also performs explicit existence checks before creating or updating related records so that API consumers receive meaningful `404 Not Found` responses.

For example:

```text
POST /tasks
     │
     ▼
Does project exist?
     │
   ┌─┴─┐
  Yes  No
   │    │
   │    └──> 404 Project not found
   ▼
Check assigned user
   │
   ▼
Create task
```

### 7.9 Design Decisions

#### Why a relational database?

TaskFlow contains clear relationships between users, projects, and tasks. PostgreSQL is well suited for enforcing these relationships through foreign keys and constraints.

#### Why separate Project and Task entities?

A project represents a larger unit of work, while tasks represent individual actionable items.

```text
Project
   │
   ├── Task
   ├── Task
   └── Task
```

This separation allows tasks to be independently created, updated, assigned, prioritized, and tracked.

#### Why is task assignment optional?

A task may initially be created without an assignee. This supports workflows where tasks are created first and assigned later.

#### Why use enums?

Statuses and priorities have a fixed set of valid values. Enums prevent invalid values from being stored in the database and make the application's business rules explicit.

### 7.10 Database Design Summary

```text
                    ┌─────────────┐
                    │    USER     │
                    └──────┬──────┘
                           │
                  ┌────────┴────────┐
                  │                 │
                owns            assigned to
                  │                 │
                  ▼                 │
             ┌──────────┐           │
             │ PROJECT  │           │
             └────┬─────┘           │
                  │                 │
                contains            │
                  │                 │
                  ▼                 ▼
             ┌────────────────────────┐
             │          TASK          │
             └────────────────────────┘
```

The resulting model keeps the database normalized around the application's core business entities while providing clear ownership, project organization, and task assignment relationships.

## 8. API and Module Structure

TaskFlow follows a modular REST API architecture using NestJS.

Each major business domain is isolated into its own module:

```text
src/
├── users/
├── projects/
├── tasks/
└── prisma/
```

### 8.1 Module Structure

Each feature module follows a consistent structure:

```text
users/
├── dto/
│   ├── create-user.dto.ts
│   └── update-user.dto.ts
├── users.controller.ts
├── users.service.ts
├── users.controller.spec.ts
├── users.service.spec.ts
└── users.module.ts
```

The same pattern is used for `ProjectsModule` and `TasksModule`.

```text
Module
 │
 ├── Controller
 │      └── HTTP endpoints
 │
 ├── Service
 │      └── Business logic
 │
 ├── DTOs
 │      └── Request validation
 │
 └── Tests
        └── Controller & service tests
```

### 8.2 Users API

Base route:

```text
/users
```

| Method   | Endpoint     | Description      |
| -------- | ------------ | ---------------- |
| `POST`   | `/users`     | Create a user    |
| `GET`    | `/users`     | Get all users    |
| `GET`    | `/users/:id` | Get a user by ID |
| `PATCH`  | `/users/:id` | Update a user    |
| `DELETE` | `/users/:id` | Delete a user    |

The Users service handles:

* User creation
* Password hashing
* Duplicate email detection
* User retrieval
* User updates
* User deletion
* Not-found handling

Passwords are never included in user API responses.

### 8.3 Projects API

Base route:

```text
/projects
```

| Method   | Endpoint        | Description         |
| -------- | --------------- | ------------------- |
| `POST`   | `/projects`     | Create a project    |
| `GET`    | `/projects`     | Get all projects    |
| `GET`    | `/projects/:id` | Get a project by ID |
| `PATCH`  | `/projects/:id` | Update a project    |
| `DELETE` | `/projects/:id` | Delete a project    |

Projects are associated with an owner through `ownerId`.

When creating a project, the service verifies that the owner exists before creating the record.

Project responses include basic owner information:

```json
{
  "id": 1,
  "name": "TaskFlow",
  "description": "Task management application",
  "status": "ACTIVE",
  "owner": {
    "id": 1,
    "name": "User",
    "email": "user@example.com"
  }
}
```

### 8.4 Tasks API

Base route:

```text
/tasks
```

| Method   | Endpoint     | Description      |
| -------- | ------------ | ---------------- |
| `POST`   | `/tasks`     | Create a task    |
| `GET`    | `/tasks`     | Get all tasks    |
| `GET`    | `/tasks/:id` | Get a task by ID |
| `PATCH`  | `/tasks/:id` | Update a task    |
| `DELETE` | `/tasks/:id` | Delete a task    |

Tasks have relationships with both projects and users.

When creating a task:

```text
POST /tasks
      │
      ▼
Validate Project
      │
      ▼
Validate Assignee (if provided)
      │
      ▼
Create Task
```

The `projectId` is required, while `assignedToId` is optional.

Task responses include related project and assignee information:

```json
{
  "id": 1,
  "title": "Build API",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "project": {
    "id": 1,
    "name": "TaskFlow"
  },
  "assignee": {
    "id": 2,
    "name": "User",
    "email": "user@example.com"
  }
}
```

For an unassigned task:

```json
{
  "assignee": null
}
```

### 8.5 API Validation

Incoming request bodies are validated using DTOs and NestJS's global `ValidationPipe`.

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
);
```

For example, creating a task requires a valid `projectId`:

```json
{
  "title": "Build API",
  "projectId": 1
}
```

Invalid input is rejected with a `400 Bad Request` response.

Relationship validation is handled by the service layer.

For example, if a task references a non-existent project:

```text
POST /tasks
projectId: 999
       │
       ▼
TasksService
       │
       ▼
Project does not exist
       │
       ▼
404 Project not found
```

### 8.6 HTTP Error Handling

TaskFlow uses NestJS HTTP exceptions for expected application errors.

Common responses include:

| Status | Meaning            | Example                      |
| ------ | ------------------ | ---------------------------- |
| `200`  | Successful request | GET, PATCH                   |
| `201`  | Resource created   | POST                         |
| `400`  | Invalid request    | DTO validation failure       |
| `404`  | Resource not found | Invalid user/project/task ID |
| `409`  | Conflict           | Duplicate user email         |

Examples:

```text
User not found
Project not found
Task not found
Assigned user not found
Email already exists
```

### 8.7 Request Flow

A typical request flows through the application as follows:

```text
Client
  │
  │ HTTP Request
  ▼
Controller
  │
  │ DTO validation
  ▼
Service
  │
  │ Business logic
  ▼
PrismaService
  │
  │ Database query
  ▼
PostgreSQL
  │
  │ Result
  ▼
Service
  │
  ▼
Controller
  │
  ▼
HTTP Response
```

For example:

```text
PATCH /tasks/1
       │
       ▼
TasksController.update()
       │
       ▼
TasksService.update()
       │
       ├── Verify task exists
       │
       ├── Verify assignee if provided
       │
       └── Update task
              │
              ▼
        PrismaService
              │
              ▼
         PostgreSQL
```

### 8.8 Module Dependency Structure

The overall application structure is:

```text
                    ┌──────────────┐
                    │   AppModule  │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
     UsersModule     ProjectsModule    TasksModule
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
                     PrismaModule
                           │
                           ▼
                      PostgreSQL
```

`PrismaModule` provides the shared `PrismaService`, while each feature module owns its controllers, services, DTOs, and tests.

This keeps the application modular and makes individual features easier to develop, test, and maintain.

## 9. Testing Strategy with Jest

TaskFlow uses **Jest** as its testing framework.

The primary testing focus is the **service layer**, where business logic is implemented. Prisma is mocked during unit tests so that service tests remain isolated from the PostgreSQL database.

### 9.1 Testing Principles

TaskFlow follows these principles:

* Business logic should have unit tests.
* Service tests should not depend on a real database.
* Prisma calls should be mocked.
* Both successful and failure scenarios should be tested.
* No Pull Request should be merged without passing tests.
* The developer should perform a self-review before requesting PR review.

### 9.2 Test Structure

Tests are colocated with their respective modules:

```text
src/
├── users/
│   ├── users.service.ts
│   ├── users.service.spec.ts
│   ├── users.controller.ts
│   └── users.controller.spec.ts
│
├── projects/
│   ├── projects.service.ts
│   ├── projects.service.spec.ts
│   ├── projects.controller.ts
│   └── projects.controller.spec.ts
│
└── tasks/
    ├── tasks.service.ts
    ├── tasks.service.spec.ts
    ├── tasks.controller.ts
    └── tasks.controller.spec.ts
```

The `.spec.ts` files contain Jest tests for the corresponding application components.

### 9.3 Service Layer Unit Testing

The service layer contains the application's business logic, so it is the primary focus of unit testing.

For example, `TasksService` depends on `PrismaService`:

```typescript
@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}
}
```

During unit testing, a mock Prisma object is provided instead of the real `PrismaService`.

```text
TasksService
     │
     ▼
Mock PrismaService
     │
     ├── project.findUnique()
     ├── user.findUnique()
     ├── task.findUnique()
     ├── task.findMany()
     ├── task.create()
     ├── task.update()
     └── task.delete()
```

This allows the tests to verify the service's behavior without connecting to PostgreSQL.

### 9.4 Example Prisma Mock

A simplified Prisma mock looks like:

```typescript
const mockPrisma = {
  project: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  task: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
```

The service can then be instantiated with the mock:

```typescript
service = new TasksService(mockPrisma as any);
```

The Prisma methods can be configured to return specific values:

```typescript
mockPrisma.project.findUnique.mockResolvedValue(project);
mockPrisma.task.create.mockResolvedValue(createdTask);
```

### 9.5 What Is Tested?

TaskFlow tests both **success paths** and **error paths**.

For example, `TasksService.create()` tests include:

```text
Create Task
│
├── Project exists
│     └── Create task successfully
│
├── Project does not exist
│     └── Throw NotFoundException
│
├── Assignee provided and exists
│     └── Create task successfully
│
└── Assignee provided but does not exist
      └── Throw NotFoundException
```

Similarly, update and delete operations test both valid and invalid resource IDs.

### 9.6 Controller Testing

Controllers are kept thin and delegate business logic to services.

Controller tests therefore focus on verifying that:

* The correct service method is called.
* Correct arguments are passed.
* The service result is returned.

The service itself is mocked during controller tests.

```text
Controller Test
      │
      ▼
Mock Service
      │
      ▼
Expected Service Method
```

This keeps controller tests independent from both Prisma and PostgreSQL.

### 9.7 Test Isolation

Unit tests should not depend on:

* A running PostgreSQL server
* Existing database records
* Database state
* Network services
* External APIs

Each test controls its own mocked dependencies.

This makes the tests:

* Fast
* Predictable
* Repeatable
* Independent

### 9.8 Running Tests

Run the complete Jest test suite:

```bash
npm test
```

Run Jest in watch mode during development:

```bash
npm run test:watch
```

A successful test run should report all test suites and tests as passing.

### 9.9 Build Verification

Tests are combined with a production build check before a feature is merged.

Run:

```bash
npm test
```

Then:

```bash
npm run build
```

Both commands must complete successfully before requesting PR review.

### 9.10 Pull Request Testing Rule

TaskFlow follows the rule:

> **No PR merged without tests.**

The expected development workflow is:

```text
Implement Feature
       │
       ▼
Write / Update Tests
       │
       ▼
npm test
       │
       ▼
npm run build
       │
       ▼
Self-review
       │
       ▼
Create PR
       │
       ▼
PR Review
       │
       ▼
Merge
```

A feature should not be merged if its tests are failing or if the required tests have not been added.

### 9.11 Self-Review Checklist

Before requesting review, the developer should verify:

```text
□ Feature works as expected
□ Unit tests cover the service logic
□ Success scenarios are tested
□ Error scenarios are tested
□ Prisma dependencies are mocked
□ npm test passes
□ npm run build passes
□ No unrelated changes are included
□ Code follows project conventions
□ Self-review has been completed
```

This process helps ensure that every merged feature is tested, reviewed, and buildable.
