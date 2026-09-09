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

describe('Project Members (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminToken: string;
  let ownerToken: string;
  let managerToken: string;
  let memberToken: string;

  let adminUserId: number;
  let ownerUserId: number;
  let managerUserId: number;
  let memberUserId: number;

  let projectId: number;

  const adminUser = {
    name: 'Project Member Admin',
    email: `project-member-admin-${Date.now()}@example.com`,
    password: 'Password@123',
  };

  const ownerUser = {
    name: 'Project Owner',
    email: `project-owner-${Date.now()}@example.com`,
    password: 'Password@123',
  };

  const managerUser = {
    name: 'Project Manager',
    email: `project-manager-${Date.now()}@example.com`,
    password: 'Password@123',
  };

  const memberUser = {
    name: 'Project Member',
    email: `project-member-${Date.now()}@example.com`,
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

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------
  // Authentication setup
  // ---------------------------------------------------------

  it('should register the admin user', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(adminUser)
      .expect(201);

    adminUserId = response.body.id;

    expect(response.body).toMatchObject({
      name: adminUser.name,
      email: adminUser.email,
    });

    expect(response.body).not.toHaveProperty('password');
  });

  it('should promote the admin user to ADMIN', async () => {
    await prisma.user.update({
      where: {
        id: adminUserId,
      },
      data: {
        role: UserRole.ADMIN,
      },
    });

    const response = await prisma.user.findUnique({
      where: {
        id: adminUserId,
      },
    });

    expect(response?.role).toBe(UserRole.ADMIN);
  });

  it('should register the project owner', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(ownerUser)
      .expect(201);

    ownerUserId = response.body.id;

    expect(response.body).toMatchObject({
      name: ownerUser.name,
      email: ownerUser.email,
    });
  });

  it('should register the project manager', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(managerUser)
      .expect(201);

    managerUserId = response.body.id;

    expect(response.body).toMatchObject({
      name: managerUser.name,
      email: managerUser.email,
    });
  });

  it('should register the project member', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(memberUser)
      .expect(201);

    memberUserId = response.body.id;

    expect(response.body).toMatchObject({
      name: memberUser.name,
      email: memberUser.email,
    });
  });

  it('should login the admin user', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: adminUser.email,
        password: adminUser.password,
      })
      .expect(200);

    adminToken = response.body.accessToken;

    expect(adminToken).toBeDefined();
  });

  it('should login the project owner', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: ownerUser.email,
        password: ownerUser.password,
      })
      .expect(200);

    ownerToken = response.body.accessToken;

    expect(ownerToken).toBeDefined();
  });

  it('should login the project manager', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: managerUser.email,
        password: managerUser.password,
      })
      .expect(200);

    managerToken = response.body.accessToken;

    expect(managerToken).toBeDefined();
  });

  it('should login the project member', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: memberUser.email,
        password: memberUser.password,
      })
      .expect(200);

    memberToken = response.body.accessToken;

    expect(memberToken).toBeDefined();
  });

  // ---------------------------------------------------------
  // Project setup
  // ---------------------------------------------------------

  it('should create a project with the owner user', async () => {
    /*
     * Important:
     *
     * ownerUser is a global MEMBER.
     * A global MEMBER cannot create a project according to
     * the existing Project RBAC rules.
     *
     * Therefore ADMIN creates the project, but ownerId is
     * set to ownerUserId.
     *
     * This verifies that:
     *
     * UserRole != ProjectMemberRole
     *
     * The owner can be a global MEMBER while still becoming
     * a project MANAGER automatically.
     */

    const response = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Project Members E2E Project',
        description: 'Project for Project Members E2E testing',
        ownerId: ownerUserId,
      })
      .expect(201);

    projectId = response.body.id;

    expect(response.body).toMatchObject({
      name: 'Project Members E2E Project',
      description: 'Project for Project Members E2E testing',
      ownerId: ownerUserId,
    });

    expect(projectId).toBeDefined();
  });

  // ---------------------------------------------------------
  // Automatic owner membership
  // ---------------------------------------------------------

  it('should automatically add the project owner as a manager', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);

    expect(response.body[0]).toMatchObject({
      user: {
        id: ownerUserId,
        name: ownerUser.name,
        email: ownerUser.email,
      },
      role: 'MANAGER',
    });
  });

  // ---------------------------------------------------------
  // Add members
  // ---------------------------------------------------------

  it('should allow the project owner to add a member', async () => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        userId: memberUserId,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      projectId,
      userId: memberUserId,
      role: 'MEMBER',
    });
  });

  it('should reject adding the same user twice', async () => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        userId: memberUserId,
      })
      .expect(409);

    expect(response.body.message).toBe(
      'User is already a member of this project',
    );
  });

  it('should allow the project owner to add another member', async () => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        userId: managerUserId,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      projectId,
      userId: managerUserId,
      role: 'MEMBER',
    });
  });

  // ---------------------------------------------------------
  // Get members
  // ---------------------------------------------------------

  it('should return all project members', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    expect(response.body).toHaveLength(3);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user: expect.objectContaining({
            id: ownerUserId,
            email: ownerUser.email,
          }),
          role: 'MANAGER',
        }),
        expect.objectContaining({
          user: expect.objectContaining({
            id: managerUserId,
            email: managerUser.email,
          }),
          role: 'MEMBER',
        }),
        expect.objectContaining({
          user: expect.objectContaining({
            id: memberUserId,
            email: memberUser.email,
          }),
          role: 'MEMBER',
        }),
      ]),
    );
  });

  // ---------------------------------------------------------
  // Member authorization
  // ---------------------------------------------------------

  it('should reject a normal project member from updating members', async () => {
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/members/${managerUserId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        role: 'MANAGER',
      })
      .expect(403);
  });

  it('should reject a normal project member from removing members', async () => {
    await request(app.getHttpServer())
      .delete(`/projects/${projectId}/members/${managerUserId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);
  });

  // ---------------------------------------------------------
  // Promote project manager
  // ---------------------------------------------------------

  it('should allow the project owner to promote a member to manager', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/members/${managerUserId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        role: 'MANAGER',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      projectId,
      userId: managerUserId,
      role: 'MANAGER',
    });
  });

  it('should allow a project manager to update another member', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        role: 'MANAGER',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      projectId,
      userId: memberUserId,
      role: 'MANAGER',
    });
  });

  // ---------------------------------------------------------
  // Owner protection
  // ---------------------------------------------------------

  it('should not allow the project owner to be demoted', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/members/${ownerUserId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        role: 'MEMBER',
      })
      .expect(403);

    expect(response.body.message).toBe(
      'Project owner must remain a manager',
    );
  });

  // ---------------------------------------------------------
  // Manager removes member
  // ---------------------------------------------------------

  it('should allow a project manager to remove a project member', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/projects/${projectId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(response.body).toEqual({
      message: 'Project member removed successfully',
    });
  });

  // ---------------------------------------------------------
  // Removed member loses project membership
  // ---------------------------------------------------------

  it('should reject the removed member from managing project members', async () => {
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/members/${managerUserId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        role: 'MEMBER',
      })
      .expect(403);
  });

  // ---------------------------------------------------------
  // Admin permissions
  // ---------------------------------------------------------

  it('should allow an admin to add a project member', async () => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: memberUserId,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      projectId,
      userId: memberUserId,
      role: 'MEMBER',
    });
  });

  it('should allow an admin to update a project member', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'MANAGER',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      projectId,
      userId: memberUserId,
      role: 'MANAGER',
    });
  });

  it('should allow an admin to remove a project member', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/projects/${projectId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toEqual({
      message: 'Project member removed successfully',
    });
  });

  // ---------------------------------------------------------
  // Owner cannot be removed
  // ---------------------------------------------------------

  it('should not allow even an admin to remove the project owner', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/projects/${projectId}/members/${ownerUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);

    expect(response.body.message).toBe(
      'Project owner cannot be removed',
    );
  });

  // ---------------------------------------------------------
  // Invalid user / project
  // ---------------------------------------------------------

  it('should return 404 when adding a non-existent user', async () => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: 999999,
      })
      .expect(404);

    expect(response.body.message).toBe('User not found');
  });

  it('should return 404 when getting members of a non-existent project', async () => {
    const response = await request(app.getHttpServer())
      .get('/projects/999999/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(response.body.message).toBe('Project not found');
  });

  it('should return 404 when updating a non-existent project member', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/members/999999`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'MANAGER',
      })
      .expect(404);

    expect(response.body.message).toBe(
      'Project member not found',
    );
  });

  it('should return 404 when removing a non-existent project member', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/projects/${projectId}/members/999999`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(response.body.message).toBe(
      'Project member not found',
    );
  });

  // ---------------------------------------------------------
  // Authentication protection
  // ---------------------------------------------------------

  it('should reject unauthenticated access to project members', async () => {
    await request(app.getHttpServer())
      .get(`/projects/${projectId}/members`)
      .expect(401);
  });
});