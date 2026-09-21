import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

type AuthenticatedRequest = Request & {
  requestId?: string;
  user?: { sub?: number };
};

/**
 * Logs one safe, structured entry after every HTTP response completes.
 *
 * Deliberately excluded: request bodies, cookies, authorization headers, and
 * query parameters. Those fields can contain passwords or access tokens.
 */
export class RequestLoggingMiddleware {
  private readonly logger = new Logger(RequestLoggingMiddleware.name);

  use(request: AuthenticatedRequest, response: Response, next: NextFunction) {
    const requestId = getRequestId(request);
    const startedAt = process.hrtime.bigint();

    request.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);

    response.once('finish', () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      this.logger.log(
        JSON.stringify({
          event: 'http_request',
          requestId,
          method: request.method,
          path: request.path,
          statusCode: response.statusCode,
          durationMs: Number(durationMs.toFixed(1)),
          ...(request.user?.sub ? { userId: request.user.sub } : {}),
        }),
      );
    });

    next();
  }
}

function getRequestId(request: Request) {
  const header = request.headers['x-request-id'];
  const value = Array.isArray(header) ? header[0] : header;

  // Accept only a short, log-safe identifier supplied by a trusted client.
  if (value && /^[A-Za-z0-9._-]{1,100}$/.test(value)) {
    return value;
  }

  return randomUUID();
}
