import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PushService } from './push.service.js';

describe('PushService', () => {
  const prisma = {
    pushSubscription: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const messaging = { sendEachForMulticast: jest.fn() };
  let service: PushService;
  const event = {
    id: 'event-1',
    userId: 2,
    actorId: 1,
    message: 'Assigned',
    href: '/tasks/4',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    service = new PushService(prisma as any, { get: jest.fn() } as any);
  });

  it('does not register when Admin credentials are missing', async () => {
    await expect(service.register(2, 'token')).rejects.toThrow(
      'not configured',
    );
    expect(prisma.pushSubscription.upsert).not.toHaveBeenCalled();
  });

  it('binds a token to the authenticated user, replacing an old account association', async () => {
    jest.spyOn(service as any, 'messaging').mockReturnValue(messaging);
    await service.register(2, 'token');
    expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith({
      where: { token: 'token' },
      create: { token: 'token', userId: 2 },
      update: { userId: 2 },
    });
  });

  it('can only unregister tokens owned by the requester', async () => {
    await service.unregister(2, 'token');
    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { userId: 2, token: 'token' },
    });
  });

  it('sends data-only messages to recipient tokens and deletes only invalid tokens', async () => {
    jest.spyOn(service as any, 'messaging').mockReturnValue(messaging);
    prisma.pushSubscription.findMany.mockResolvedValue([
      { token: 'valid' },
      { token: 'expired' },
    ]);
    messaging.sendEachForMulticast.mockResolvedValue({
      failureCount: 1,
      responses: [
        { success: true },
        { error: { code: 'messaging/registration-token-not-registered' } },
      ],
    });
    await service.send(event);
    expect(prisma.pushSubscription.findMany).toHaveBeenCalledWith({
      where: { userId: 2 },
    });
    const message = messaging.sendEachForMulticast.mock.calls[0][0] as any;
    expect(message.tokens).toEqual(['valid', 'expired']);
    expect(message.data.userId).toBe('2');
    expect(message).not.toHaveProperty('notification');
    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { userId: 2, token: { in: ['expired'] } },
    });
  });

  it('does not propagate Firebase delivery failures to task mutations', async () => {
    jest.spyOn(service as any, 'messaging').mockReturnValue(messaging);
    prisma.pushSubscription.findMany.mockResolvedValue([{ token: 'token' }]);
    messaging.sendEachForMulticast.mockRejectedValue(
      new Error('FCM unavailable'),
    );
    await expect(service.send(event)).resolves.toBeUndefined();
    expect(prisma.pushSubscription.deleteMany).not.toHaveBeenCalled();
  });
});
