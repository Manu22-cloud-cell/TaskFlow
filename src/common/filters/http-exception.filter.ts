import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

type ExceptionBody = {
  error?: string;
  message?: string | string[];
};

/**
 * Converts every REST API error into one predictable response shape.
 *
 * Known HttpExceptions preserve their useful message. Unexpected errors are
 * logged internally and return a safe, generic message to the client.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<{ method: string; url: string }>();
    const response = context.getResponse<{
      status: (statusCode: number) => { json: (body: unknown) => void };
    }>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttpException
      ? getExceptionBody(exception.getResponse())
      : undefined;

    if (!isHttpException || statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} failed with status ${statusCode}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json({
      statusCode,
      message: body?.message ?? 'Internal server error',
      error: body?.error ?? HttpStatus[statusCode],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

function getExceptionBody(response: string | object): ExceptionBody {
  if (typeof response === 'string') {
    return { message: response };
  }

  return response as ExceptionBody;
}
