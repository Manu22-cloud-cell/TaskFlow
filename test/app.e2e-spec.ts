import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { UserRole } from '../src/generated/prisma/enums.js';

describe('Auth + Projects (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let accessToken: string;
  let userId: number;
  let projectId: number;

  const testUser = {
    name: 'App E2E Admin',
    email: `app-e2e-${Date.now()}@example.com`,
    password: 'Password@123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    // Prisma is used here only for test data setup.
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should authenticate a user and perform project CRUD operations', async () => {
    // 1. Register user
    const registerResponse = await request(
      app.getHttpServer(),
    )
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    userId = registerResponse.body.id;

    expect(registerResponse.body).toMatchObject({
      name: testUser.name,
      email: testUser.email,
    });

    expect(registerResponse.body).not.toHaveProperty(
      'password',
    );

    // Registration intentionally creates users as MEMBER.
    // Promote the test user to ADMIN for this E2E workflow.
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role: UserRole.ADMIN,
      },
    });

    // 2. Login and receive access token
    const loginResponse = await request(
      app.getHttpServer(),
    )
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200);

    accessToken = loginResponse.body.accessToken;

    expect(accessToken).toBeDefined();

    expect(loginResponse.body.user).toMatchObject({
      name: testUser.name,
      email: testUser.email,
    });

    // 3. Create project using authenticated user
    const createResponse = await request(
      app.getHttpServer(),
    )
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'App E2E Project',
        description: 'Project created through combined E2E flow',
        ownerId: userId,
      })
      .expect(201);

    projectId = createResponse.body.id;

    expect(createResponse.body).toMatchObject({
      name: 'App E2E Project',
      description: 'Project created through combined E2E flow',
      ownerId: userId,
    });

    expect(projectId).toBeDefined();

    // 4. Read project
    const getResponse = await request(
      app.getHttpServer(),
    )
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getResponse.body).toMatchObject({
      id: projectId,
      name: 'App E2E Project',
      ownerId: userId,
    });

    // 5. Update project
    const updateResponse = await request(
      app.getHttpServer(),
    )
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Updated App E2E Project',
      })
      .expect(200);

    expect(updateResponse.body).toMatchObject({
      id: projectId,
      name: 'Updated App E2E Project',
    });

    // 6. Delete project
    const deleteResponse = await request(
      app.getHttpServer(),
    )
      .delete(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(deleteResponse.body).toEqual({
      message: 'Project deleted successfully',
    });

    // 7. Verify project no longer exists
    await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});