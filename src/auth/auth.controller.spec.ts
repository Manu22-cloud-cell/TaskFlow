import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    me: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should refresh tokens', async () => {
    const request = {
      headers: {
        cookie: 'taskflow_refresh_token=old-refresh-token',
      },
    };
    const response = { cookie: jest.fn() };

    const refreshedTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      },
    };

    mockAuthService.refresh.mockResolvedValue(refreshedTokens);

    const result = await controller.refresh(
      request as never,
      response as never,
    );

    expect(mockAuthService.refresh).toHaveBeenCalledWith('old-refresh-token');

    expect(response.cookie).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ user: refreshedTokens.user });
  });
});
