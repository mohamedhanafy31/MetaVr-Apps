import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthController } from 'src/auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  const mockAuthService = {
    login: jest.fn(),
    handleHandshake: jest.fn(),
    logout: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    mockAuthService.login.mockResolvedValue({
      role: 'admin',
    });
    mockAuthService.handleHandshake.mockResolvedValue({
      role: 'admin',
      redirectTo: '/admin/dashboard',
    });
    mockAuthService.logout.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login returns success payload without handshake token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'secret123' })
      .expect(201);

    expect(response.body).toEqual({
      success: true,
      message: 'Login successful',
      role: 'admin',
    });
    expect(mockAuthService.login).toHaveBeenCalled();
    expect(mockAuthService.login.mock.calls[0][0]).toEqual({
      email: 'user@example.com',
      password: 'secret123',
    });
  });

  it('POST /auth/handshake returns redirect info', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/handshake')
      .send({ token: 'dummy' })
      .expect(201);

    expect(response.body).toEqual({
      success: true,
      message: 'Session created',
      role: 'admin',
      redirectTo: '/admin/dashboard',
    });
    expect(mockAuthService.handleHandshake).toHaveBeenCalled();
  });

  it('POST /auth/login propagates UnauthorizedException as 401', async () => {
    mockAuthService.login.mockRejectedValueOnce(new UnauthorizedException('Invalid credentials'));

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'wrong' })
      .expect(401);

    expect(response.body.message).toBe('Invalid credentials');
  });

  it('POST /auth/handshake propagates BadRequestException as 400', async () => {
    mockAuthService.handleHandshake.mockRejectedValueOnce(new BadRequestException('Invalid token'));

    const response = await request(app.getHttpServer())
      .post('/auth/handshake')
      .send({ token: 'bad' })
      .expect(400);

    expect(response.body.message).toBe('Invalid token');
  });

  it('POST /auth/logout returns success', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .expect(201);

    expect(response.body).toEqual({
      success: true,
      message: 'Logged out',
    });
    expect(mockAuthService.logout).toHaveBeenCalled();
  });
});

