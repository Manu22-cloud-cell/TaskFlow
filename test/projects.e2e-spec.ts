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

describe('Projects (e2e)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;

    let adminToken: string;
    let memberToken: string;

    let adminUserId: number;
    let projectId: number;

    const adminUser = {
        name: 'Projects E2E Admin',
        email: `projects-admin-${Date.now()}@example.com`,
        password: 'Password@123',
    };

    const memberUser = {
        name: 'Projects E2E Member',
        email: `projects-member-${Date.now()}@example.com`,
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

    it('should register an admin test user', async () => {
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

        // Registration intentionally creates users as MEMBER.
        // For this E2E test, promote the test user directly in the DB
        // so we can test ADMIN-only functionality.
        await prisma.user.update({
            where: {
                id: adminUserId,
            },
            data: {
                role: UserRole.ADMIN,
            },
        });
    });

    it('should login as admin', async () => {
        const response = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: adminUser.email,
                password: adminUser.password,
            })
            .expect(200);

        adminToken = response.body.accessToken;

        expect(adminToken).toBeDefined();

        expect(response.body.user).toMatchObject({
            name: adminUser.name,
            email: adminUser.email,
        });
    });

    it('should create a project as admin', async () => {
        const response = await request(app.getHttpServer())
            .post('/projects')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'E2E Test Project',
                description: 'Project created during E2E testing',
                ownerId: adminUserId,
            })
            .expect(201);

        projectId = response.body.id;

        expect(response.body).toMatchObject({
            name: 'E2E Test Project',
            description: 'Project created during E2E testing',
            ownerId: adminUserId,
        });

        expect(projectId).toBeDefined();
    });

    it('should get all projects as admin', async () => {
        const response = await request(app.getHttpServer())
            .get('/projects')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);

        expect(response.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: projectId,
                    name: 'E2E Test Project',
                }),
            ]),
        );
    });

    it('should get a project by id as admin', async () => {
        const response = await request(app.getHttpServer())
            .get(`/projects/${projectId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(response.body).toMatchObject({
            id: projectId,
            name: 'E2E Test Project',
            ownerId: adminUserId,
        });
    });

    it('should update a project as admin', async () => {
        const response = await request(app.getHttpServer())
            .patch(`/projects/${projectId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Updated E2E Project',
            })
            .expect(200);

        expect(response.body).toMatchObject({
            id: projectId,
            name: 'Updated E2E Project',
        });
    });

    it('should register a member user', async () => {
        const response = await request(app.getHttpServer())
            .post('/auth/register')
            .send(memberUser)
            .expect(201);

        expect(response.body).toMatchObject({
            name: memberUser.name,
            email: memberUser.email,
        });

        expect(response.body).not.toHaveProperty('password');
    });

    it('should login as member', async () => {
        const response = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: memberUser.email,
                password: memberUser.password,
            })
            .expect(200);

        memberToken = response.body.accessToken;

        expect(memberToken).toBeDefined();

        expect(response.body.user).toMatchObject({
            name: memberUser.name,
            email: memberUser.email,
        });
    });

    it('should allow a member to read projects', async () => {
        await request(app.getHttpServer())
            .get('/projects')
            .set('Authorization', `Bearer ${memberToken}`)
            .expect(200);
    });

    it('should reject a member from creating a project', async () => {
        await request(app.getHttpServer())
            .post('/projects')
            .set('Authorization', `Bearer ${memberToken}`)
            .send({
                name: 'Member Project',
                description: 'This project should not be created',
                ownerId: adminUserId,
            })
            .expect(403);
    });

    it('should reject a member from updating a project', async () => {
        await request(app.getHttpServer())
            .patch(`/projects/${projectId}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send({
                name: 'Unauthorized Update',
            })
            .expect(403);
    });

    it('should reject a member from deleting a project', async () => {
        await request(app.getHttpServer())
            .delete(`/projects/${projectId}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .expect(403);
    });

    it('should delete a project as admin', async () => {
        const response = await request(app.getHttpServer())
            .delete(`/projects/${projectId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(response.body).toEqual({
            message: 'Project deleted successfully',
        });

        await request(app.getHttpServer())
            .get(`/projects/${projectId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(404);
    });
});

