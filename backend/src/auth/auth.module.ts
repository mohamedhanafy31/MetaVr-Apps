import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CsrfOriginGuard } from './guards/csrf-origin.guard';
import {
  DEFAULT_TOKEN_ISSUER,
  SESSION_TOKEN_AUDIENCE,
} from './auth.constants';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    ConfigModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('SESSION_SECRET');
        const rawPrivateKey = config.get<string>('SESSION_PRIVATE_KEY');
        const rawPublicKey = config.get<string>('SESSION_PUBLIC_KEY');
        const issuer = config.get<string>('SESSION_TOKEN_ISSUER', DEFAULT_TOKEN_ISSUER);
        const audience = config.get<string>('SESSION_TOKEN_AUDIENCE', SESSION_TOKEN_AUDIENCE);

        if (!secret) {
          throw new Error(
            'SESSION_SECRET environment variable must be set before starting the AuthModule.',
          );
        }

        if (rawPrivateKey && rawPublicKey) {
          const normalize = (key: string) => key.replace(/\\n/g, '\n');
          return {
            privateKey: normalize(rawPrivateKey),
            publicKey: normalize(rawPublicKey),
            signOptions: {
              algorithm: 'RS256',
              issuer,
              audience,
            },
            verifyOptions: {
              algorithms: ['RS256'],
              issuer,
              audience,
            },
          };
        }

        return {
          secret,
          signOptions: {
            issuer,
            audience,
            algorithm: 'HS256',
          },
          verifyOptions: {
            issuer,
            audience,
            algorithms: ['HS256'],
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, CsrfOriginGuard],
  exports: [AuthService],
})
export class AuthModule {}

