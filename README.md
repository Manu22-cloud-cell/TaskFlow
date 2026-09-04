# TaskFlow

TaskFlow is a backend task management application built with **NestJS, PostgreSQL, and Prisma**.

It provides APIs for managing users, projects, and tasks, with JWT-based authentication and a test-driven development approach using Jest.

The project is designed as a practical backend application for learning and demonstrating production-oriented backend development concepts such as modular architecture, dependency injection, relational database design, authentication, validation, testing, and Git-based development workflows.

## 🚀 Features

### Users

* Create users
* Retrieve users
* Retrieve a user by ID
* Update user details
* Delete users
* Password hashing using bcrypt
* Passwords are never returned in API responses

### Authentication

* User registration
* User login
* Password verification using bcrypt
* JWT access-token generation
* Protected authentication flow
* Invalid credentials return `401 Unauthorized`

### Projects

* Create projects
* Retrieve projects
* Retrieve a project by ID
* Update projects
* Delete projects
* Project ownership through users
* Project status management

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
* Validation and error scenarios

## 🛠️ Tech Stack

| Technology      | Purpose                  |
| --------------- | ------------------------ |
| NestJS          | Backend framework        |
| TypeScript      | Programming language     |
| PostgreSQL      | Relational database      |
| Prisma          | ORM and database toolkit |
| bcrypt          | Password hashing         |
| JWT             | Authentication           |
| Jest            | Unit testing             |
| class-validator | Request validation       |
| Postman         | API testing              |

## 🏗️ Architecture

TaskFlow follows NestJS's modular architecture:

```text
src/
├── auth/
│   ├── dto/
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
Controller
     ↓
DTO Validation
     ↓
Service
     ↓
Prisma
     ↓
PostgreSQL
     ↓
HTTP Response
```

## 🗄️ Database

TaskFlow uses PostgreSQL with Prisma ORM.

Current core entities:

```text
User
 │
 ├── owns → Project
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

The Prisma schema is located at:

```text
prisma/schema.prisma
```

## 🔐 Authentication

TaskFlow uses JWT-based authentication.

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

Passwords are hashed before being stored and are never included in the response.

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
  "user": {
    "id": 1,
    "name": "Test User",
    "email": "testuser@example.com"
  }
}
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

## 📡 API Endpoints

### Authentication

| Method | Endpoint         | Description           |
| ------ | ---------------- | --------------------- |
| POST   | `/auth/register` | Register a new user   |
| POST   | `/auth/login`    | Login and receive JWT |

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
```

> Never commit `.env` or real secrets to Git.

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

The project follows the principle:

> **No PR should be merged without appropriate tests.**

Current test coverage includes:

* Users service
* Users controller
* Projects service
* Projects controller
* Tasks service
* Tasks controller
* Auth service
* Auth controller

## 🔄 Development Workflow

Feature development follows a Git branch and pull-request workflow.

Example:

```bash
git checkout main
git pull origin main

git checkout -b feature/example-feature
```

After implementation:

```bash
npm test
npm run build
git status
git diff
```

Then commit and push:

```bash
git add .
git commit -m "feat: add example feature"
git push -u origin feature/example-feature
```

Before requesting review:

* Run the complete test suite.
* Run the production build.
* Review your own diff.
* Verify the PR checklist.
* Confirm no secrets or generated files are committed.
* Confirm tests cover the implemented behavior.

## 📚 Development Documentation

For detailed information about the project's engineering practices, architecture, database design, testing strategy, and development setup, see:

```text
docs/DEVELOPMENT.md
```

This document contains deeper technical documentation that is intentionally kept separate from this high-level README.

## 🗺️ Roadmap

Planned improvements include:

* Refresh-token rotation
* JWT authentication guard
* Role-based authorization
* Admin / Manager / Member roles
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

## 📄 License

This project is currently intended as a learning and portfolio project.
