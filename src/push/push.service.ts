import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PrismaService } from '../prisma/prisma.service.js';

export type PushEvent = {
  id: string;
  userId: number;
  actorId: number;
  message: string;
  href: string;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private messaging() {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) return null;
    const app =
      getApps().find((item) => item.name === 'taskflow-push') ??
      initializeApp(
        { credential: cert({ projectId, clientEmail, privateKey }) },
        'taskflow-push',
      );
    return getMessaging(app);
  }

  async register(userId: number, token: string) {
    if (!this.messaging())
      throw new ServiceUnavailableException(
        'Browser push is not configured on the server.',
      );
    await this.prisma.pushSubscription.upsert({
      where: { token },
      create: { token, userId },
      update: { userId },
    });
    return { registered: true };
  }

  async unregister(userId: number, token: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, token } });
    return { registered: false };
  }

  async send(event: PushEvent) {
    // Push delivery is best-effort and must never fail an already-saved mutation.
    try {
      const messaging = this.messaging();
      if (!messaging) return;
      const subscriptions = await this.prisma.pushSubscription.findMany({
        where: { userId: event.userId },
      });
      for (let offset = 0; offset < subscriptions.length; offset += 500) {
        const batch = subscriptions.slice(offset, offset + 500);
        const result = await messaging.sendEachForMulticast({
          tokens: batch.map((item) => item.token),
          data: {
            id: event.id,
            userId: String(event.userId),
            message: event.message.slice(0, 500),
            href: event.href,
          },
          webpush: { headers: { TTL: '300', Urgency: 'normal' } },
        });
        const invalid = result.responses.flatMap((response, index) =>
          [
            'messaging/registration-token-not-registered',
            'messaging/invalid-registration-token',
          ].includes(response.error?.code ?? '')
            ? [batch[index].token]
            : [],
        );
        if (invalid.length)
          await this.prisma.pushSubscription.deleteMany({
            where: { userId: event.userId, token: { in: invalid } },
          });
        if (result.failureCount)
          this.logger.warn(
            `Push delivery: ${result.failureCount} failed recipient(s).`,
          );
      }
    } catch {
      // Do not log tokens, credentials or message contents.
      this.logger.warn(
        'Firebase push delivery failed; in-app delivery remains available.',
      );
    }
  }
}
