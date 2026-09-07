import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [AuthController],
        providers: [
          {
            provide: AuthService,
            useValue: mockAuthService,
          },
        ],
      }).compile();

    controller =
      module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should refresh tokens', async () => {
    const refreshTokenDto = {
      refreshToken: 'old-refresh-token',
    };

    const refreshedTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      },
    };

    mockAuthService.refresh.mockResolvedValue(
      refreshedTokens,
    );

    const result = await controller.refresh(
      refreshTokenDto,
    );

    expect(
      mockAuthService.refresh,
    ).toHaveBeenCalledWith(
      refreshTokenDto.refreshToken,
    );

    expect(result).toEqual(refreshedTokens);
  });
});