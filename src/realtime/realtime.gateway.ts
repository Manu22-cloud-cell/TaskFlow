import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

import {
  ACCESS_TOKEN_COOKIE,
  getCookieFromHeader,
} from '../auth/auth-cookies.js';
import {
  AuthenticatedUser,
  ProjectAccessService,
} from '../projects/project-access.service.js';

type ProjectJoinPayload = { projectId: number };

export type TaskRealtimeEvent =
  'task.created' | 'task.updated' | 'task.moved' | 'task.deleted';

@Injectable()
@WebSocketGateway({
  namespace: 'realtime',
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = getCookieFromHeader(
        client.handshake.headers.cookie,
        ACCESS_TOKEN_COOKIE,
      );

      if (!token) throw new WsException('Access token is required');

      const secret = this.configService.get<string>('JWT_SECRET');

      if (!secret) throw new Error('JWT_SECRET is not configured');

      client.data.user = await this.jwtService.verifyAsync<AuthenticatedUser>(
        token,
        { secret },
      );
      client.emit('realtime.ready');
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('project.join')
  async joinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ProjectJoinPayload,
  ) {
    const requester = client.data.user as AuthenticatedUser | undefined;

    if (!requester) throw new WsException('Unauthenticated socket');
    if (!Number.isInteger(payload?.projectId) || payload.projectId <= 0) {
      throw new WsException('A valid project ID is required');
    }

    await this.projectAccess.assertCanViewProject(payload.projectId, requester);
    await client.join(this.projectRoom(payload.projectId));

    return { projectId: payload.projectId };
  }

  emitTaskEvent(projectId: number, event: TaskRealtimeEvent, taskId: number) {
    this.server.to(this.projectRoom(projectId)).emit(event, {
      projectId,
      taskId,
    });
  }

  private projectRoom(projectId: number) {
    return `project:${projectId}`;
  }
}
