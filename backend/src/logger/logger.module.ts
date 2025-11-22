import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from './logger.service';

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const logLevel = configService.get('LOG_LEVEL') || (isProduction ? 'info' : 'debug');

        // Console transport with colors
        const consoleTransport = new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
              const contextStr = context ? `[${context}]` : '';
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
              const traceStr = trace ? `\n${trace}` : '';
              return `${timestamp} ${level} ${contextStr} ${message} ${metaStr}${traceStr}`;
            }),
          ),
        });

        // File transports with rotation
        const errorFileTransport = new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '30d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        });

        const combinedFileTransport = new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        });

        // Access log for HTTP requests
        const accessFileTransport = new DailyRotateFile({
          filename: 'logs/access-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        });

        return {
          level: logLevel,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'context'] }),
          ),
          defaultMeta: {
            service: 'metavr-backend',
            environment: configService.get('NODE_ENV') || 'development',
          },
          transports: [
            consoleTransport,
            errorFileTransport,
            combinedFileTransport,
            accessFileTransport,
          ],
          exceptionHandlers: [
            new DailyRotateFile({
              filename: 'logs/exceptions-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              maxSize: '20m',
              maxFiles: '30d',
            }),
          ],
          rejectionHandlers: [
            new DailyRotateFile({
              filename: 'logs/rejections-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              maxSize: '20m',
              maxFiles: '30d',
            }),
          ],
        };
      },
    }),
  ],
  providers: [AppLoggerService],
  exports: [WinstonModule, AppLoggerService],
})
export class LoggerModule {}

