import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware.js';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const requestLoggingMiddleware = new RequestLoggingMiddleware();

  app.use((request: Request, response: Response, next: NextFunction) => {
    requestLoggingMiddleware.use(request, response, next);
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
