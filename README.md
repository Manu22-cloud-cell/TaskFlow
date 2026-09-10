# TaskFlow

TaskFlow is a backend task management application built with **NestJS, PostgreSQL, and Prisma**.

It provides APIs for managing users, projects, and tasks, with JWT-based authentication, role-based authorization, request validation, relational database design, and Jest unit testing.

The project is designed as a practical backend application for learning and demonstrating production-oriented backend development concepts such as modular architecture, dependency injection, authentication, authorization, database relationships, validation, testing, and Git-based development workflows.

---

## 🚀 Features

### Users

* Create users

* Retrieve users

* Retrieve a user by ID

* Update user details

* Delete users

* Password hashing using bcrypt

* Passwords are never returned in API responses

* Email uniqueness validation

### Authentication

* User registration

* User login

* Password verification using bcrypt

* JWT access-token generation

* JWT refresh-token generation

* Refresh-token rotation

* Refresh-token hashing before database storage

* Refresh-token expiration validation

* Reused/invalid refresh tokens are rejected

* Protected routes using JWT authentication guard

* Invalid credentials return `401 Unauthorized`

### Role-Based Authorization

TaskFlow supports three user roles:

* `ADMIN`

* `MANAGER`

* `MEMBER`

Role-based access control is implemented using:

* `@Roles()` decorator

* `RolesGuard`

* `JwtAuthGuard`

Authentication and authorization are handled separately:

```text

JwtAuthGuard

 ↓

Who are you?

 ↓

request.user

 ↓

RolesGuard

 ↓

Are you allowed?

 ↓

Controller

```

### Projects

* Create projects

* Retrieve projects

* Retrieve a project by ID

* Update projects

* Delete projects

* Project ownership through users

* Project status management

* Role-based access control

Current project permissions:

| Endpoint               | ADMIN | MANAGER | MEMBER |

| ---------------------- | :---: | :-----: | :----: |

| `GET /projects`        |   ✅   |    ✅    |    ✅   |

| `GET /projects/:id`    |   ✅   |    ✅    |    ✅   |

| `POST /projects`       |   ✅   |    ✅    |    ❌   |

| `PATCH /projects/:id`  |   ✅   |    ✅    |    ❌   |

| `DELETE /projects/:id` |   ✅   |    ❌    |    ❌   |

### Tasks

* Create tasks

* Retrieve tasks

* Retrieve a task by ID

* Update tasks

* Delete tasks

* Assign tasks to users

* Associate tasks with projects

* Task status and priority management

* Optional due dates

### Testing

* Jest unit tests

* Service-layer testing with mocked Prisma dependencies

* Controller tests

* Authentication service tests

* Authentication controller tests

* RolesGuard tests

* Validation and error scenarios

* Unauthorized and forbidden access scenarios

---

## 🛠️ Tech Stack

| Technology        | Purpose                  |

| ----------------- | ------------------------ |

| NestJS            | Backend framework        |

| TypeScript        | Programming language     |

| PostgreSQL        | Relational database      |

| Prisma            | ORM and database toolkit |

| bcrypt            | Password hashing         |

| JWT               | Authentication           |

| Jest              | Unit testing             |

| class-validator   | Request validation       |

| class-transformer | Request transformation   |

| Postman           | API testing              |

---

## 🏗️ Architecture

TaskFlow follows NestJS's modular architecture:

```text

src/

├── auth/

│   ├── decorators/

│   ├── dto/

│   ├── guards/

│   ├── auth.controller.ts

│   ├── auth.service.ts

│   └── auth.module.ts

│

├── users/

│   ├── dto/

│   ├── users.controller.ts

│   ├── users.service.ts

│   └── users.module.ts

│

├── projects/

│   ├── dto/

│   ├── projects.controller.ts

│   ├── projects.service.ts

│   └── projects.module.ts

│

├── tasks/

│   ├── dto/

│   ├── tasks.controller.ts

│   ├── tasks.service.ts

│   └── tasks.module.ts

│

├── project-members/

│   ├── dto/

│   ├── project-members.controller.ts

│   ├── project-members.service.ts

│   └── project-members.module.ts

│

├── prisma/

│   ├── prisma.module.ts

│   └── prisma.service.ts

│

├── app.module.ts

└── main.ts

```

The application follows the typical NestJS request flow:

```text

HTTP Request

 ↓

Authentication Guard

 ↓

Authorization Guard

 ↓

DTO Validation

 ↓

Controller

 ↓

Service

 ↓

Prisma

 ↓

PostgreSQL

 ↓

HTTP Response

```

---

## 🗄️ Database

TaskFlow uses PostgreSQL with Prisma ORM.

### Core entities

```text

User

│

├── owns → Project

│             │

│             ├── has many → ProjectMember

│             │                    │

│             │                    └── belongs to → User

│             │

│             └── contains → Task

│

└── assigned to → Task

```

The main relationships are:

* One User can own many Projects.

* One Project can contain many Tasks.

* One User can be assigned many Tasks.

* A Task belongs to one Project.

* A Task can optionally be assigned to a User.

* Users have an authorization role: `ADMIN`, `MANAGER`, or `MEMBER`.

The Prisma schema is located at:

```text

prisma/schema.prisma

```

---

## 🔐 Authentication

TaskFlow uses JWT-based authentication with separate access and refresh tokens.

### Register

```http

POST /auth/register

```

Example request:

```json

{

"name": "Test User",

"email": "testuser@example.com",

"password": "password123"

}

```

Example response:

```json

{

"id": 1,

"name": "Test User",

"email": "testuser@example.com",

"createdAt": "2026-09-04T05:57:51.635Z",

"updatedAt": "2026-09-04T05:57:51.635Z"

}

```

Passwords are hashed using bcrypt before being stored and are never included in API responses.

### Login

```http

POST /auth/login

```

Example request:

```json

{

"email": "testuser@example.com",

"password": "password123"

}

```

Example response:

```json

{

"accessToken": "eyJ...",

"refreshToken": "eyJ...",

"user": {

"id": 1,

"name": "Test User",

"email": "testuser\@example.com"

}

}

```

The access token is used to access protected endpoints.

Send it using:

```http

Authorization: Bearer <access-token>

```

Invalid credentials return:

```http

401 Unauthorized

```

with:

```json

{

"message": "Invalid email or password",

"error": "Unauthorized",

"statusCode": 401

}

```

### Refresh Access Token

```http

POST /auth/refresh

```

The refresh endpoint:

1. Verifies the refresh token.

2. Checks that the associated user exists.

3. Checks refresh-token expiration.

4. Compares the supplied token against the stored bcrypt hash.

5. Generates a new access token.

6. Generates a new refresh token.

7. Stores the new refresh-token hash.

8. Invalidates the previous refresh token.

Example request:

```json

{

"refreshToken": "eyJ..."

}

```

Example response:

```json

{

"accessToken": "eyJ...",

"refreshToken": "eyJ...",

"user": {

"id": 1,

"name": "Test User",

"email": "testuser\@example.com"

}

}

```

A previous refresh token cannot be used again after successful rotation.

---

## 🛡️ Authorization

TaskFlow uses Role-Based Access Control (RBAC).

The authentication process determines **who the user is**, while authorization determines **what the user is allowed to do**.

### Authentication

`JwtAuthGuard`:

* Reads the `Authorization` header.

* Validates the Bearer token.

* Verifies the JWT signature and expiration.

* Attaches the decoded user information to `request.user`.

* Returns `401 Unauthorized` when authentication fails.

### Authorization

`RolesGuard`:

* Reads roles configured using the `@Roles()` decorator.

* Gets the authenticated user's role from `request.user`.

* Allows or denies access based on the required roles.

* Returns `403 Forbidden` when the user does not have permission.

Example:

```ts

@UseGuards(JwtAuthGuard, RolesGuard)

@Roles(UserRole.ADMIN, UserRole.MANAGER)

@Post()

async create() {

// ...

}

```

This means only `ADMIN` and `MANAGER` users can access the endpoint.

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint         | Description                                 |

| ------ | ---------------- | ------------------------------------------- |

| POST   | `/auth/register` | Register a new user                         |

| POST   | `/auth/login`    | Login and receive access/refresh tokens     |

| POST   | `/auth/refresh`  | Rotate refresh token and receive new tokens |

### Users

| Method | Endpoint     | Description    |

| ------ | ------------ | -------------- |

| POST   | `/users`     | Create user    |

| GET    | `/users`     | Get all users  |

| GET    | `/users/:id` | Get user by ID |

| PATCH  | `/users/:id` | Update user    |

| DELETE | `/users/:id` | Delete user    |

### Projects

| Method | Endpoint        | Description       |

| ------ | --------------- | ----------------- |

| POST   | `/projects`     | Create project    |

| GET    | `/projects`     | Get all projects  |

| GET    | `/projects/:id` | Get project by ID |

| PATCH  | `/projects/:id` | Update project    |

| DELETE | `/projects/:id` | Delete project    |

### Tasks

| Method | Endpoint     | Description    |

| ------ | ------------ | -------------- |

| POST   | `/tasks`     | Create task    |

| GET    | `/tasks`     | Get all tasks  |

| GET    | `/tasks/:id` | Get task by ID |

| PATCH  | `/tasks/:id` | Update task    |

| DELETE | `/tasks/:id` | Delete task    |

---

## ⚙️ Project Setup

### Prerequisites

Make sure the following are installed:

* Node.js

* npm

* PostgreSQL

### 1. Clone the repository

```bash

git clone <repository-url>

cd taskflow

```

### 2. Install dependencies

```bash

npm install

```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env

PORT=3000

DB_HOST=localhost

DB_PORT=5432

DB_USERNAME=your_postgres_username

DB_PASSWORD=your_postgres_password

DB_NAME=taskflow

DATABASE_URL="postgresql://your_postgres_username:your_postgres_password@localhost:5432/taskflow"

JWT_SECRET=your-super-secret-key

JWT_EXPIRES_IN=15m

JWT_REFRESH_SECRET=your-refresh-secret-key

JWT_REFRESH_EXPIRES_IN=7d

```

Never commit `.env` or real secrets to Git.

A sample environment file is provided as:

```text

.env.example

```

### 4. Create the database

Make sure PostgreSQL is running and create the `taskflow` database.

### 5. Run Prisma migrations

```bash

npx prisma migrate dev

```

### 6. Generate Prisma Client

```bash

npx prisma generate

```

---

## ▶️ Running the Application

### Development

```bash

npm run start

```

### Watch mode

```bash

npm run start:dev

```

The application runs on:

```text

http://localhost:3000

```

---

## 🧪 Testing

Run all unit tests:

```bash

npm test

```

Run tests in watch mode:

```bash

npm run test:watch

```

Run a specific test file:

```bash

npm test -- auth.service.spec.ts

```

Build the application:

```bash

npm run build

```

The current test suite contains:

* Users service tests

* Users controller tests

* Projects service tests

* Projects controller tests

* Tasks service tests

* Tasks controller tests

* Auth service tests

* Auth controller tests

* RolesGuard tests

**Current status: 62 tests passing across 10 test suites.**

The project follows the principle:

> **No PR should be merged without appropriate tests.**

---

## 🔄 Development Workflow

TaskFlow currently follows a **main-branch development workflow**.

Development is performed directly on `main`:

```bash

git checkout main

git pull origin main

```

After implementing a feature:

```bash

npm test

npm run build

git status

git diff

```

Review the changes before committing:

```bash

git add .

git commit -m "feat: add example feature"

git push origin main

```

Before pushing changes:

* Run the complete test suite.

* Run the production build.

* Review your own diff.

* Verify the implementation against the requirements.

* Confirm no secrets are committed.

* Confirm no generated/unwanted files are committed.

* Confirm tests cover the implemented behavior.

---

## 📚 Development Documentation

For detailed information about the project's engineering practices, architecture, database design, testing strategy, and development setup, see:

```text

docs/DEVELOPMENT.md

```

This document contains deeper technical documentation that is intentionally kept separate from this high-level README.

---

## 🗺️ Roadmap

Planned improvements include:

* Project members

* Task comments

* Task activity/audit history

* Labels and tags

* Subtasks

* Task dependencies

* Pagination and filtering

* Swagger/OpenAPI documentation

* End-to-end testing

* Notifications and real-time updates

---

## 📄 License

This project is currently intended as a learning and portfolio project.