import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import {
  clearAuthCookies,
  getCookie,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
} from './auth-cookies.js';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);

    setAuthCookies(response, result);

    return { user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = getCookie(request, REFRESH_TOKEN_COOKIE);
    const result = await this.authService.refresh(refreshToken ?? '');

    setAuthCookies(response, result);

    return { user: result.user };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() request: Request & { user: { sub: number } }) {
    return this.authService.me(request.user.sub);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() request: Request & { user: { sub: number } },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.logout(request.user.sub);

    clearAuthCookies(response);

    return result;
  }
}
