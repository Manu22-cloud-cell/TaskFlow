import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ACCESS_TOKEN_COOKIE, getCookie } from '../auth-cookies.js';

@Injectable()
export class JwtAuthGuard {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authorization = request.headers.authorization;
    let token = getCookie(request, ACCESS_TOKEN_COOKIE);

    if (authorization) {
      const [type, bearerToken] = authorization.split(' ');

      if (type !== 'Bearer' || !bearerToken) {
        throw new UnauthorizedException('Invalid authorization header');
      }

      token = bearerToken;
    }

    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    const secret = this.configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret,
      });

      request.user = payload;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
