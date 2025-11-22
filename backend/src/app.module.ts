import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from './logger/logger.module';
import { EmailModule } from './email/email.module';
import { UserAccessModule } from './auth/user-access.module';
import { HealthModule } from './health/health.module';
import { HttpLoggingMiddleware } from './logger/http-logging.middleware';
import { HttpExceptionFilter } from './logger/http-exception.filter';
import { LoggingInterceptor } from './logger/logging.interceptor';
import { AppsSyncService } from './apps/apps-sync.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      expandVariables: true,
    }),
    LoggerModule,
    FirebaseModule,
    AuthModule,
    EmailModule,
    UserAccessModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    AppsSyncService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggingMiddleware).forRoutes('*');
  }
}

