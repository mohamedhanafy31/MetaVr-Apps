import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CsrfOriginGuard } from './guards/csrf-origin.guard';
import { AppLoggerService } from '../logger/logger.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            handleHandshake: jest.fn(),
            logout: jest.fn(),
          },
        },
        {
          provide: CsrfOriginGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:3000'),
          },
        },
        {
          provide: AppLoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
            logRequest: jest.fn(),
            logError: jest.fn(),
            logPerformance: jest.fn(),
            logSecurity: jest.fn(),
            logDatabase: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('returns login response', async () => {
    authService.login.mockResolvedValue({
      role: 'admin',
    });
    const res = { cookie: jest.fn() } as any;

    const result = await controller.login(
      {
        email: 'user@example.com',
        password: 'password123',
        rememberMe: true,
      },
      res,
    );

    expect(result).toEqual({
      success: true,
      message: 'Login successful',
      role: 'admin',
    });
  });

  it('propagates login errors', async () => {
    authService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

    await expect(
      controller.login(
        {
          email: 'user@example.com',
          password: 'wrong',
        },
        { cookie: jest.fn() } as any,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('handles handshake response', async () => {
    authService.handleHandshake.mockResolvedValue({
      role: 'supervisor',
      redirectTo: '/supervisor/dashboard',
    });

    const res = { cookie: jest.fn() } as any;
    const req = { headers: {}, originalUrl: '/auth/handshake' } as any;
    const result = await controller.handshake({ token: 'handshake-token' }, req, res);

    expect(result).toEqual({
      success: true,
      message: 'Session created',
      role: 'supervisor',
      redirectTo: '/supervisor/dashboard',
    });
    expect(authService.handleHandshake).toHaveBeenCalledWith('handshake-token', req, res);
  });

  it('propagates handshake errors', async () => {
    authService.handleHandshake.mockRejectedValue(new BadRequestException('invalid token'));

    await expect(
      controller.handshake(
        { token: 'bad' },
        { headers: {}, originalUrl: '/auth/handshake' } as any,
        { cookie: jest.fn() } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('invokes logout and returns response', async () => {
    const res = { cookie: jest.fn() } as any;
    const req = { headers: {}, originalUrl: '/auth/logout' } as any;

    const result = await controller.logout(req, res);

    expect(authService.logout).toHaveBeenCalledWith(req, res);
    expect(result).toEqual({ success: true, message: 'Logged out' });
  });
});

