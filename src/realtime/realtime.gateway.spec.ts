import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { ProjectAccessService } from '../projects/project-access.service.js';
import { RealtimeGateway } from './realtime.gateway.js';

describe('RealtimeGateway', () => {
  const mockJwtService = {
    verifyAsync: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn(),
  };
  const mockProjectAccess = {
    assertCanViewProject: jest.fn(),
  };
  const mockRoom = {
    emit: jest.fn(),
  };
  const mockServer = {
    to: jest.fn(() => mockRoom),
  };

  let gateway: RealtimeGateway;

  beforeEach(() => {
    jest.resetAllMocks();
    mockServer.to.mockReturnValue(mockRoom);
    gateway = new RealtimeGateway(
      mockJwtService as unknown as JwtService,
      mockConfigService as unknown as ConfigService,
      mockProjectAccess as unknown as ProjectAccessService,
    );
    (gateway as unknown as { server: typeof mockServer }).server = mockServer;
  });

  it('authenticates a socket with the access-token cookie', async () => {
    const user = { sub: 2, email: 'member@example.com', role: 'MEMBER' };
    const client = {
      handshake: {
        headers: { cookie: 'taskflow_access_token=valid-token' },
      },
      data: {},
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
    mockConfigService.get.mockReturnValue('test-secret');
    mockJwtService.verifyAsync.mockResolvedValue(user);

    await gateway.handleConnection(client as never);

    expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
      secret: 'test-secret',
    });
    expect(client.data).toEqual({ user });
    expect(client.emit).toHaveBeenCalledWith('realtime.ready');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('disconnects a socket when authentication fails', async () => {
    const client = {
      handshake: { headers: {} },
      data: {},
      emit: jest.fn(),
      disconnect: jest.fn(),
    };

    await gateway.handleConnection(client as never);

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('authorizes a user before joining a project room', async () => {
    const user = { sub: 2, email: 'member@example.com', role: 'MEMBER' };
    const client = {
      data: { user },
      join: jest.fn(),
    };

    const result = await gateway.joinProject(client as never, {
      projectId: 12,
    });

    expect(mockProjectAccess.assertCanViewProject).toHaveBeenCalledWith(
      12,
      user,
    );
    expect(client.join).toHaveBeenCalledWith('project:12');
    expect(result).toEqual({ projectId: 12 });
  });

  it('emits task changes only to the affected project room', () => {
    gateway.emitTaskEvent(12, 'task.moved', 45);

    expect(mockServer.to).toHaveBeenCalledWith('project:12');
    expect(mockRoom.emit).toHaveBeenCalledWith('task.moved', {
      projectId: 12,
      taskId: 45,
    });
  });
});
