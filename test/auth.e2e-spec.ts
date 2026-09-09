import {
    INestApplication,
    ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module.js';

describe('Auth (e2e)', () => {
    let app: INestApplication<App>;

    let accessToken: string;
    let refreshToken: string;

    const testUser = {
        name: 'Auth E2E User',
        email: `auth-e2e-${Date.now()}@example.com`,
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
    });

    afterAll(async () => {
        await app.close();
    });

    it('should register a new user', async () => {
        const response = await request(app.getHttpServer())
            .post('/auth/register')
            .send(testUser)
            .expect(201);

        expect(response.body).toMatchObject({
            name: testUser.name,
            email: testUser.email,
        });

        expect(response.body).not.toHaveProperty('password');
    });

    it('should login with valid credentials', async () => {
        const response = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password,
            })
            .expect(200);

        accessToken = response.body.accessToken;
        refreshToken = response.body.refreshToken;

        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');

        expect(response.body.user).toMatchObject({
            name: testUser.name,
            email: testUser.email,
        });

        expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject access to protected endpoint without JWT', async () => {
        await request(app.getHttpServer())
            .get('/projects')
            .expect(401);
    });

    it('should allow access to protected endpoint with valid JWT', async () => {
        await request(app.getHttpServer())
            .get('/projects')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
    });

    it('should refresh access and rotate refresh token', async () => {
        const oldRefreshToken = refreshToken;

        const response = await request(app.getHttpServer())
            .post('/auth/refresh')
            .send({
                refreshToken: oldRefreshToken,
            })
            .expect(200);

        expect(response.body.accessToken).toBeDefined();
        expect(response.body.refreshToken).toBeDefined();

        expect(response.body.refreshToken).not.toBe(oldRefreshToken);

        expect(response.body.user).toMatchObject({
            name: testUser.name,
            email: testUser.email,
        });

        accessToken = response.body.accessToken;
        refreshToken = response.body.refreshToken;

        await request(app.getHttpServer())
            .get('/projects')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        await request(app.getHttpServer())
            .post('/auth/refresh')
            .send({
                refreshToken: oldRefreshToken,
            })
            .expect(401);
    });

});

