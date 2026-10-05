import { Body, Controller, Delete, Post, Req, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PushService } from './push.service.js';

class PushTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token: string;
}

@Controller('push/subscriptions')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post()
  register(
    @Req() request: { user: { sub: number } },
    @Body() body: PushTokenDto,
  ) {
    return this.push.register(request.user.sub, body.token);
  }

  @Delete()
  unregister(
    @Req() request: { user: { sub: number } },
    @Body() body: PushTokenDto,
  ) {
    return this.push.unregister(request.user.sub, body.token);
  }
}
