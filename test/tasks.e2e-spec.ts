import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { UserRole } from '../src/generated/prisma/enums.js';

describe('Task board (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let memberToken: string;
  let adminId: number;
  let memberId: number;
  let projectId: number;
  let firstTaskId: number;
  let memberTaskId: number;

  const suffix = Date.now();
  const admin = {
    name: 'Board Admin',
    email: `board-admin-${suffix}@example.com`,
    password: 'Password@123',
  };
  const member = {
    name: 'Board Member',
    email: `board-member-${suffix}@example.com`,
    password: 'Password@123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates users and authenticates the admin', async () => {
    const adminResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(admin)
      .expect(201);
    adminId = adminResponse.body.id;
    await prisma.user.update({ where: { id: adminId }, data: { role: UserRole.ADMIN } });

    const memberResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(member)
      .expect(201);
    memberId = memberResponse.body.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(200);
    adminToken = loginResponse.body.accessToken;

    const memberLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: member.email, password: member.password })
      .expect(200);
    memberToken = memberLoginResponse.body.accessToken;
  });

  it('lists a project board and moves a task between columns', async () => {
    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Board Project', ownerId: adminId })
      .expect(201);
    projectId = projectResponse.body.id;

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: memberId })
      .expect(201);

    const firstTaskResponse = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'First board task', projectId })
      .expect(201);
    firstTaskId = firstTaskResponse.body.id;

    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Second board task', projectId })
      .expect(201);

    const boardResponse = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks`)
      .query({ status: 'TODO', page: 1, limit: 10 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(boardResponse.body.meta).toEqual({
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    });
    expect(boardResponse.body.data.map((task: { position: number }) => task.position))
      .toEqual([0, 1]);

    const movedTaskResponse = await request(app.getHttpServer())
      .patch(`/tasks/${firstTaskId}/move`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS', position: 0 })
      .expect(200);

    expect(movedTaskResponse.body).toMatchObject({
      id: firstTaskId,
      status: 'IN_PROGRESS',
      position: 0,
    });

    const memberTaskResponse = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Member board task',
        projectId,
        assignedToId: memberId,
      })
      .expect(201);
    memberTaskId = memberTaskResponse.body.id;
  });

  it('allows a project member to read the board and transition their assigned task', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    expect(response.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: firstTaskId }),
    ]));

    await request(app.getHttpServer())
      .patch(`/tasks/${memberTaskId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'COMPLETED' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: memberTaskId,
          status: 'COMPLETED',
          position: 0,
        });
      });

    await request(app.getHttpServer())
      .patch(`/tasks/${firstTaskId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'COMPLETED' })
      .expect(403);
  });
});
