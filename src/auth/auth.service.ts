import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  async register(registerDto: RegisterDto) {
    return this.usersService.create(registerDto);
  }

  async login(loginDto: LoginDto) {
    const user =
      await this.usersService.findByEmailForAuth(
        loginDto.email,
      );

    if (!user) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken =
      await this.jwtService.signAsync(payload);

    const refreshSecret =
      this.configService.get<string>(
        'JWT_REFRESH_SECRET',
      );

    if (!refreshSecret) {
      throw new Error(
        'JWT_REFRESH_SECRET is not configured',
      );
    }

    const refreshExpiresIn =
      this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
      ) ?? '7d';

    const refreshTokenExpiryMs =
      this.getRefreshTokenExpiryMs(
        refreshExpiresIn,
      );

    const refreshToken =
      await this.jwtService.signAsync(
        {
          ...payload,
          jti: randomUUID(),
        },
        {
          secret: refreshSecret,
          expiresIn: Math.floor(
            refreshTokenExpiryMs / 1000,
          ),
        },
      );

    const refreshTokenHash =
      await bcrypt.hash(refreshToken, 10);

    const refreshTokenExpiresAt =
      new Date(
        Date.now() + refreshTokenExpiryMs,
      );

    await this.usersService.updateRefreshToken(
      user.id,
      refreshTokenHash,
      refreshTokenExpiresAt,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async refresh(refreshToken: string) {
    const refreshSecret =
      this.configService.get<string>(
        'JWT_REFRESH_SECRET',
      );

    if (!refreshSecret) {
      throw new Error(
        'JWT_REFRESH_SECRET is not configured',
      );
    }

    let payload: {
      sub: number;
      email: string;
      jti: string;
    };

    /*
     * Step 1:
     * Verify that the refresh token is a valid JWT
     * signed with our refresh-token secret.
     */
    try {
      payload =
        await this.jwtService.verifyAsync<{
          sub: number;
          email: string;
          jti: string;
        }>(refreshToken, {
          secret: refreshSecret,
        });
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired refresh token',
      );
    }

    /*
     * Step 2:
     * Find the user associated with the token.
     */
    const user =
      await this.usersService.findByIdForAuth(
        payload.sub,
      );

    if (!user) {
      throw new UnauthorizedException(
        'Invalid or expired refresh token',
      );
    }

    /*
     * Step 3:
     * Make sure the user currently has a valid
     * refresh-token session.
     */
    if (
      !user.refreshTokenHash ||
      !user.refreshTokenExpiresAt ||
      user.refreshTokenExpiresAt <= new Date()
    ) {
      throw new UnauthorizedException(
        'Invalid or expired refresh token',
      );
    }

    /*
     * Step 4:
     * Compare the supplied refresh token against
     * the hash currently stored in the database.
     */
    const refreshTokenMatches =
      await bcrypt.compare(
        refreshToken,
        user.refreshTokenHash,
      );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException(
        'Invalid or expired refresh token',
      );
    }

    /*
     * Step 5:
     * Generate a new access token.
     */
    const newAccessToken =
      await this.jwtService.signAsync({
        sub: user.id,
        email: user.email,
      });

    /*
     * Step 6:
     * Generate a new refresh token.
     *
     * randomUUID() ensures that every refresh token
     * receives a unique JWT ID.
     */
    const refreshExpiresIn =
      this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
      ) ?? '7d';

    const refreshTokenExpiryMs =
      this.getRefreshTokenExpiryMs(
        refreshExpiresIn,
      );

    const newRefreshToken =
      await this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
          jti: randomUUID(),
        },
        {
          secret: refreshSecret,
          expiresIn: Math.floor(
            refreshTokenExpiryMs / 1000,
          ),
        },
      );

    /*
     * Step 7:
     * Hash the new refresh token before storing it.
     */
    const newRefreshTokenHash =
      await bcrypt.hash(
        newRefreshToken,
        10,
      );

    const newRefreshTokenExpiresAt =
      new Date(
        Date.now() + refreshTokenExpiryMs,
      );

    /*
     * Step 8:
     * Replace the old refresh-token hash
     * with the new one.
     */
    await this.usersService.updateRefreshToken(
      user.id,
      newRefreshTokenHash,
      newRefreshTokenExpiresAt,
    );

    /*
     * Step 9:
     * Return the new tokens.
     *
     * Passwords and refresh-token hashes are never
     * returned to the client.
     */
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  private getRefreshTokenExpiryMs(
    expiresIn: string,
  ): number {
    const match = expiresIn.match(
      /^(\d+)([smhd])$/,
    );

    if (!match) {
      throw new Error(
        'JWT_REFRESH_EXPIRES_IN must use a format such as 30s, 15m, 1h, or 7d',
      );
    }

    const value = Number(match[1]);
    const unit = match[2];

    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return (
      value *
      multipliers[
      unit as keyof typeof multipliers
      ]
    );
  }
}