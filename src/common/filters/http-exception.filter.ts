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

type RequestWithContext = {
  method: string;
  path: string;
  requestId?: string;
};

/**
 * Converts every REST API error into one predictable response shape.
 *
 * Known 4xx HttpExceptions preserve their useful message. Every 5xx error is
 * logged internally and returns a safe, generic message to the client.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithContext>();
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
    const isServerError = statusCode >= HttpStatus.INTERNAL_SERVER_ERROR;

    if (!isHttpException || isServerError) {
      this.logger.error(
        JSON.stringify({
          event: 'http_error',
          requestId: request.requestId,
          method: request.method,
          path: request.path,
          statusCode,
        }),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json({
      statusCode,
      message: isServerError
        ? 'Internal server error'
        : (body?.message ?? HttpStatus[statusCode]),
      error: isServerError
        ? 'Internal Server Error'
        : (body?.error ?? HttpStatus[statusCode]),
      timestamp: new Date().toISOString(),
      path: request.path,
      requestId: request.requestId,
    });
  }
}

function getExceptionBody(response: string | object): ExceptionBody {
  if (typeof response === 'string') {
    return { message: response };
  }

  return response as ExceptionBody;
}
