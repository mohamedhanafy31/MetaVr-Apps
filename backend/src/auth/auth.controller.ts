import {
  Body,
  Controller,
  Post,
  Res,
  Req,
  UseGuards,
  Get,
  Query,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { HandshakeDto } from './dto/handshake.dto';
import { CsrfOriginGuard } from './guards/csrf-origin.guard';
import {
  CheckAccessCodeDto,
  RegenerateAccessCodeDto,
  SyncAccessCodesDto,
  SendSupervisorWelcomeDto,
} from './dto/access-code.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(CsrfOriginGuard)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto, res);
    return {
      success: true,
      message: 'Login successful',
      role: result.role,
    };
  }

  @UseGuards(CsrfOriginGuard)
  @Post('handshake')
  async handshake(
    @Body() dto: HandshakeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { role, redirectTo } = await this.authService.handleHandshake(dto?.token, req, res);
    return {
      success: true,
      message: 'Session created',
      role,
      redirectTo,
    };
  }

  @UseGuards(CsrfOriginGuard)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req, res);
    return { success: true, message: 'Logged out' };
  }

  @Get('validate-app-access')
  async validateAppAccess(@Req() req: Request, @Query('appPath') appPath: string) {
    const sessionToken = this.getCookie(req, 'session');
    if (!sessionToken) {
      return {
        success: false,
        allowed: false,
        message: 'No session token found',
      };
    }

    if (!appPath) {
      return {
        success: false,
        allowed: false,
        message: 'appPath query parameter is required',
      };
    }

    const result = await this.authService.validateAppAccess(sessionToken, appPath);
    return {
      success: true,
      allowed: result.allowed,
      role: result.role,
      userId: result.userId,
    };
  }

  @Post('access-codes/check')
  async checkAccessCode(@Body() dto: CheckAccessCodeDto) {
    const result = await this.authService.verifyAccessCode(dto.appKey, dto.code);
    return {
      success: true,
      valid: result.valid,
      supervisorEmail: result.supervisorEmail,
      supervisorId: result.supervisorId,
      userEmail: result.userEmail,
      userId: result.userId,
      role: result.role,
    };
  }

  @Post('access-codes/sync')
  async syncAccessCodes(@Req() req: Request, @Body() dto: SyncAccessCodesDto) {
    await this.assertAdminSession(req);
    const data = await this.authService.syncSupervisorAccessCodes(dto.supervisorId, dto.assignments);
    return {
      success: true,
      data: this.serializeAccessCodes(data),
    };
  }

  @UseGuards(CsrfOriginGuard)
  @Post('supervisors/welcome-email')
  async sendSupervisorWelcomeEmail(@Req() req: Request, @Body() dto: SendSupervisorWelcomeDto) {
    await this.assertAdminSession(req);
    await this.authService.sendSupervisorWelcomeEmail(dto.supervisorId, dto.password);
    return {
      success: true,
      message: 'Welcome email sent successfully',
    };
  }

  @Post('access-codes/regenerate')
  async regenerateAccessCode(@Req() req: Request, @Body() dto: RegenerateAccessCodeDto) {
    await this.assertAdminSession(req);
    const entry = await this.authService.regenerateSupervisorAccessCode(dto.supervisorId, dto.appKey);
    return {
      success: true,
      data: this.serializeAccessCodes({ [dto.appKey]: entry })[dto.appKey],
    };
  }

  private getCookie(req: Request, name: string): string | undefined {
    const cookieJar = (req as any).cookies;
    if (cookieJar && cookieJar[name]) {
      return cookieJar[name];
    }

    const header = req.headers?.cookie;
    if (!header) {
      return undefined;
    }

    const match = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    if (!match) {
      return undefined;
    }

    const value = match.substring(name.length + 1);
    if (value === '') {
      return undefined; // Treat empty value as missing cookie
    }

    try {
      return decodeURIComponent(value);
    } catch (error) {
      // Handle invalid percent encoding gracefully
      // Note: Controller doesn't have logger, so we just return undefined
      return undefined;
    }
  }

  private async assertAdminSession(req: Request) {
    const sessionToken = this.getCookie(req, 'session');
    if (!sessionToken) {
      throw new UnauthorizedException('Session token required');
    }

    const payload = await this.authService.validateSessionToken(sessionToken);
    if (payload.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return payload;
  }

  private serializeAccessCodes(accessCodes: Record<string, any>) {
    const result: Record<string, unknown> = {};
    Object.entries(accessCodes || {}).forEach(([key, value]) => {
      result[key] = {
        code: value?.code,
        appId: value?.appId,
        appName: value?.appName,
        appPath: value?.appPath,
        updatedAt: value?.updatedAt,
      };
    });
    return result;
  }
}

