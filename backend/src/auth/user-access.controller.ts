import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserAccessService } from './user-access.service';
import {
  SubmitAccessRequestDto,
  ApproveAccessRequestDto,
  RejectAccessRequestDto,
  RegenerateUserAccessCodeDto,
  ResendAccessCodeDto,
  ToggleUserAppAccessDto,
} from './dto/user-access-request.dto';
import { AuthService } from './auth.service';
import { CsrfOriginGuard } from './guards/csrf-origin.guard';

@Controller('user-access')
export class UserAccessController {
  constructor(
    private readonly userAccessService: UserAccessService,
    private readonly authService: AuthService,
  ) {}

  // Public endpoint - no CSRF guard needed
  @Post('request')
  async submitAccessRequest(@Body() dto: SubmitAccessRequestDto) {
    const result = await this.userAccessService.submitAccessRequest(dto);
    return result;
  }

  @Get('requests')
  async getAccessRequests(@Req() req: Request): Promise<{ success: boolean; data: any }> {
    const sessionToken = this.getCookie(req, 'session');
    if (!sessionToken) {
      throw new UnauthorizedException('Session token required');
    }

    const payload = await this.authService.validateSessionToken(sessionToken);
    if (payload.role !== 'supervisor') {
      throw new UnauthorizedException('Supervisor access required');
    }

    const requests = await this.userAccessService.getAccessRequests(payload.userId);
    return {
      success: true,
      data: requests,
    };
  }

  @Get('requests/history')
  async getAccessRequestHistory(@Req() req: Request): Promise<{ success: boolean; data: any[] }> {
    const sessionToken = this.getCookie(req, 'session');
    if (!sessionToken) {
      throw new UnauthorizedException('Session token required');
    }

    const payload = await this.authService.validateSessionToken(sessionToken);
    if (payload.role !== 'supervisor') {
      throw new UnauthorizedException('Supervisor access required');
    }

    const limitParam = Number((req.query as Record<string, any>)?.limit);
    const history = await this.userAccessService.getAccessRequestHistory(payload.userId, {
      limit: Number.isFinite(limitParam) ? limitParam : undefined,
    });
    return {
      success: true,
      data: history,
    };
  }

  @UseGuards(CsrfOriginGuard)
  @Post('approve')
  async approveAccessRequest(@Req() req: Request, @Body() dto: ApproveAccessRequestDto) {
    const sessionToken = this.getCookie(req, 'session');
    if (!sessionToken) {
      throw new UnauthorizedException('Session token required');
    }

    const payload = await this.authService.validateSessionToken(sessionToken);
    if (payload.role !== 'supervisor') {
      throw new UnauthorizedException('Supervisor access required');
    }

    const result = await this.userAccessService.approveAccessRequest(dto, payload.userId);
    return result;
  }

  @UseGuards(CsrfOriginGuard)
  @Post('reject')
  async rejectAccessRequest(@Req() req: Request, @Body() dto: RejectAccessRequestDto) {
    const sessionToken = this.getCookie(req, 'session');
    if (!sessionToken) {
      throw new UnauthorizedException('Session token required');
    }

    const payload = await this.authService.validateSessionToken(sessionToken);
    if (payload.role !== 'supervisor') {
      throw new UnauthorizedException('Supervisor access required');
    }

    const result = await this.userAccessService.rejectAccessRequest(dto, payload.userId);
    return result;
  }

  @UseGuards(CsrfOriginGuard)
  @Post('regenerate-code')
  async regenerateUserAccessCode(@Req() req: Request, @Body() dto: RegenerateUserAccessCodeDto) {
    const sessionToken = this.getCookie(req, 'session');
    if (!sessionToken) {
      throw new UnauthorizedException('Session token required');
    }

    const payload = await this.authService.validateSessionToken(sessionToken);
    if (payload.role !== 'supervisor') {
      throw new UnauthorizedException('Supervisor access required');
    }

    const result = await this.userAccessService.regenerateUserAccessCode(dto, payload.userId);
    return result;
  }

  // Public endpoint - no CSRF guard needed
  @Post('resend-code')
  async resendAccessCode(@Body() dto: ResendAccessCodeDto) {
    const result = await this.userAccessService.resendAccessCode(dto);
    return result;
  }

  @Get('users')
  async getUsersWithAccess(@Req() req: Request) {
    const sessionToken = this.getCookie(req, 'session');
    if (!sessionToken) {
      throw new UnauthorizedException('Session token required');
    }

    const payload = await this.authService.validateSessionToken(sessionToken);
    if (payload.role !== 'supervisor') {
      throw new UnauthorizedException('Supervisor access required');
    }

    const users = await this.userAccessService.getUsersWithAccess(payload.userId);
    return {
      success: true,
      data: users,
    };
  }

  @UseGuards(CsrfOriginGuard)
  @Post('toggle-access')
  async toggleUserAppAccess(@Req() req: Request, @Body() dto: ToggleUserAppAccessDto) {
    const sessionToken = this.getCookie(req, 'session');
    if (!sessionToken) {
      throw new UnauthorizedException('Session token required');
    }

    const payload = await this.authService.validateSessionToken(sessionToken);
    if (payload.role !== 'supervisor') {
      throw new UnauthorizedException('Supervisor access required');
    }

    const result = await this.userAccessService.toggleUserAppAccess(dto, payload.userId);
    return result;
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
      return undefined;
    }

    try {
      return decodeURIComponent(value);
    } catch (error) {
      return undefined;
    }
  }
}

