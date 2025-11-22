import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppLoggerService } from './logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use Winston logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.DASHBOARD_ORIGIN?.split(',') ?? '*',
    credentials: true,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);

  const logger = app.get(AppLoggerService);
  logger.log(`MetaVR backend is running on port ${port}`, 'Bootstrap', {
    port,
    environment: process.env.NODE_ENV || 'development',
  } as Record<string, unknown>);
}

bootstrap();

