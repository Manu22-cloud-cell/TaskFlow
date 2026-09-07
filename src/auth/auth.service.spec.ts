import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    create: jest.fn(),
    findByEmailForAuth: jest.fn(),
    findByIdForAuth: jest.fn(),
    updateRefreshToken: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_REFRESH_SECRET') {
        return 'test-refresh-secret';
      }

      if (key === 'JWT_REFRESH_EXPIRES_IN') {
        return '7d';
      }

      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          AuthService,
          {
            provide: UsersService,
            useValue: mockUsersService,
          },
          {
            provide: JwtService,
            useValue: mockJwtService,
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should create and return a user', async () => {
      const registerDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      const createdUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.create.mockResolvedValue(
        createdUser,
      );

      const result =
        await service.register(registerDto);

      expect(
        mockUsersService.create,
      ).toHaveBeenCalledWith(registerDto);

      expect(result).toEqual(createdUser);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'john@example.com',
      password: 'password123',
    };

    it('should return access token, refresh token and user for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash(
        loginDto.password,
        10,
      );

      const user = {
        id: 1,
        name: 'John Doe',
        email: loginDto.email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.findByEmailForAuth.mockResolvedValue(
        user,
      );

      mockJwtService.signAsync
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');

      const result = await service.login(loginDto);

      expect(
        mockUsersService.findByEmailForAuth,
      ).toHaveBeenCalledWith(loginDto.email);

      expect(
        mockJwtService.signAsync,
      ).toHaveBeenNthCalledWith(
        1,
        {
          sub: user.id,
          email: user.email,
        },
      );

      expect(
        mockJwtService.signAsync,
      ).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          sub: user.id,
          email: user.email,
          jti: expect.any(String),
        }),
        {
          secret: 'test-refresh-secret',
          expiresIn: 604800,
        },
      );

      expect(
        mockUsersService.updateRefreshToken,
      ).toHaveBeenCalledWith(
        user.id,
        expect.any(String),
        expect.any(Date),
      );

      const refreshTokenHash =
        mockUsersService.updateRefreshToken.mock.calls[0][1];

      expect(refreshTokenHash).not.toBe(
        'mock-refresh-token',
      );

      const refreshTokenMatches =
        await bcrypt.compare(
          'mock-refresh-token',
          refreshTokenHash,
        );

      expect(refreshTokenMatches).toBe(true);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });

      expect(result).not.toHaveProperty(
        'user.password',
      );
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue(
        null,
      );

      await expect(
        service.login(loginDto),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Invalid email or password',
        ),
      );

      expect(
        mockJwtService.signAsync,
      ).not.toHaveBeenCalled();

      expect(
        mockUsersService.updateRefreshToken,
      ).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash(
        'different-password',
        10,
      );

      const user = {
        id: 1,
        name: 'John Doe',
        email: loginDto.email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.findByEmailForAuth.mockResolvedValue(
        user,
      );

      await expect(
        service.login(loginDto),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Invalid email or password',
        ),
      );

      expect(
        mockJwtService.signAsync,
      ).not.toHaveBeenCalled();

      expect(
        mockUsersService.updateRefreshToken,
      ).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should return new access and refresh tokens for a valid refresh token', async () => {
      const refreshToken = 'old-refresh-token';

      const user = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashed-password',
        refreshTokenHash: await bcrypt.hash(
          refreshToken,
          10,
        ),
        refreshTokenExpiresAt: new Date(
          Date.now() + 60 * 60 * 1000,
        ),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: user.id,
        email: user.email,
        jti: 'test-refresh-jti',
      });

      mockUsersService.findByIdForAuth.mockResolvedValue(
        user,
      );

      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result =
        await service.refresh(refreshToken);

      expect(
        mockJwtService.verifyAsync,
      ).toHaveBeenCalledWith(
        refreshToken,
        {
          secret: 'test-refresh-secret',
        },
      );

      expect(
        mockUsersService.findByIdForAuth,
      ).toHaveBeenCalledWith(user.id);

      expect(
        mockJwtService.signAsync,
      ).toHaveBeenNthCalledWith(
        1,
        {
          sub: user.id,
          email: user.email,
        },
      );

      expect(
        mockJwtService.signAsync,
      ).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          sub: user.id,
          email: user.email,
          jti: expect.any(String),
        }),
        {
          secret: 'test-refresh-secret',
          expiresIn: 604800,
        },
      );

      expect(
        mockUsersService.updateRefreshToken,
      ).toHaveBeenCalledWith(
        user.id,
        expect.any(String),
        expect.any(Date),
      );

      const newRefreshTokenHash =
        mockUsersService.updateRefreshToken.mock.calls[0][1];

      expect(newRefreshTokenHash).not.toBe(
        'new-refresh-token',
      );

      const newRefreshTokenMatches =
        await bcrypt.compare(
          'new-refresh-token',
          newRefreshTokenHash,
        );

      expect(newRefreshTokenMatches).toBe(true);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });

      expect(result).not.toHaveProperty(
        'user.password',
      );
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(
        new Error('Invalid token'),
      );

      await expect(
        service.refresh('invalid-refresh-token'),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Invalid or expired refresh token',
        ),
      );

      expect(
        mockUsersService.findByIdForAuth,
      ).not.toHaveBeenCalled();

      expect(
        mockUsersService.updateRefreshToken,
      ).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 999,
        email: 'unknown@example.com',
        jti: 'test-refresh-jti',
      });

      mockUsersService.findByIdForAuth.mockResolvedValue(
        null,
      );

      await expect(
        service.refresh(
          'valid-but-unknown-user-token',
        ),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Invalid or expired refresh token',
        ),
      );

      expect(
        mockUsersService.updateRefreshToken,
      ).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when no refresh token is stored', async () => {
      const user = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashed-password',
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: user.id,
        email: user.email,
        jti: 'test-refresh-jti',
      });

      mockUsersService.findByIdForAuth.mockResolvedValue(
        user,
      );

      await expect(
        service.refresh('refresh-token'),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Invalid or expired refresh token',
        ),
      );

      expect(
        mockUsersService.updateRefreshToken,
      ).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when stored refresh token is expired', async () => {
      const refreshToken = 'expired-refresh-token';

      const user = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashed-password',
        refreshTokenHash: await bcrypt.hash(
          refreshToken,
          10,
        ),
        refreshTokenExpiresAt: new Date(
          Date.now() - 60 * 1000,
        ),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: user.id,
        email: user.email,
        jti: 'test-refresh-jti',
      });

      mockUsersService.findByIdForAuth.mockResolvedValue(
        user,
      );

      await expect(
        service.refresh(refreshToken),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Invalid or expired refresh token',
        ),
      );

      expect(
        mockUsersService.updateRefreshToken,
      ).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when refresh token does not match stored hash', async () => {
      const storedRefreshToken =
        'stored-refresh-token';

      const user = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashed-password',
        refreshTokenHash: await bcrypt.hash(
          storedRefreshToken,
          10,
        ),
        refreshTokenExpiresAt: new Date(
          Date.now() + 60 * 60 * 1000,
        ),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: user.id,
        email: user.email,
        jti: 'test-refresh-jti',
      });

      mockUsersService.findByIdForAuth.mockResolvedValue(
        user,
      );

      await expect(
        service.refresh(
          'different-refresh-token',
        ),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Invalid or expired refresh token',
        ),
      );

      expect(
        mockUsersService.updateRefreshToken,
      ).not.toHaveBeenCalled();
    });
  });
});

