import {
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { jest } from '@jest/globals';

import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  let jwtService: {
    verifyAsync: jest.Mock;
  };

  let configService: {
    get: jest.Mock;
  };

  let request: {
    headers: {
      authorization?: string;
    };
    user?: unknown;
  };

  let context: {
    switchToHttp: jest.Mock;
  };

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    request = {
      headers: {},
    };

    context = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    };

    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('should throw 401 when authorization header is missing', async () => {
    await expect(
      guard.canActivate(
        context as unknown as ExecutionContext,
      ),
    ).rejects.toThrow(
      new UnauthorizedException(
        'Access token is required',
      ),
    );
  });

  it('should throw 401 when authorization header has an invalid format', async () => {
    request.headers.authorization = 'Basic abc123';

    await expect(
      guard.canActivate(
        context as unknown as ExecutionContext,
      ),
    ).rejects.toThrow(
      new UnauthorizedException(
        'Invalid authorization header',
      ),
    );
  });

  it('should throw 401 when Bearer token is missing', async () => {
    request.headers.authorization = 'Bearer';

    await expect(
      guard.canActivate(
        context as unknown as ExecutionContext,
      ),
    ).rejects.toThrow(
      new UnauthorizedException(
        'Invalid authorization header',
      ),
    );
  });

  it('should throw an error when JWT_SECRET is not configured', async () => {
    request.headers.authorization = 'Bearer test-token';

    configService.get.mockReturnValue(undefined);

    await expect(
      guard.canActivate(
        context as unknown as ExecutionContext,
      ),
    ).rejects.toThrow(
      'JWT_SECRET is not configured',
    );

    expect(
      configService.get,
    ).toHaveBeenCalledWith('JWT_SECRET');

    expect(
      jwtService.verifyAsync,
    ).not.toHaveBeenCalled();
  });

  it('should return true and attach the payload for a valid JWT', async () => {
    const payload = {
      sub: 1,
      email: 'test@example.com',
      role: 'MEMBER',
    };

    request.headers.authorization = 'Bearer valid-token';

    configService.get.mockReturnValue('test-secret');

    jwtService.verifyAsync.mockResolvedValue(payload);

    const result = await guard.canActivate(
      context as unknown as ExecutionContext,
    );

    expect(result).toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith(
      'valid-token',
      {
        secret: 'test-secret',
      },
    );

    expect(request.user).toEqual(payload);
  });

  it('should throw 401 when JWT verification fails', async () => {
    request.headers.authorization = 'Bearer invalid-token';

    configService.get.mockReturnValue('test-secret');

    jwtService.verifyAsync.mockRejectedValue(
      new Error('Token expired'),
    );

    await expect(
      guard.canActivate(
        context as unknown as ExecutionContext,
      ),
    ).rejects.toThrow(
      new UnauthorizedException(
        'Invalid or expired access token',
      ),
    );

    expect(jwtService.verifyAsync).toHaveBeenCalledWith(
      'invalid-token',
      {
        secret: 'test-secret',
      },
    );
  });

});
