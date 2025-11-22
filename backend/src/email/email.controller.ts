import { Controller, Post, Body } from '@nestjs/common';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test')
  async testEmail(@Body() body: { to: string }) {
    const success = await this.emailService.sendEmail({
      to: body.to,
      subject: 'Test Email from MetaVR',
      text: 'This is a test email. If you receive this, your email service is working correctly!',
      html: '<h1>Test Email</h1><p>This is a test email. If you receive this, your email service is working correctly!</p>',
    });

    return {
      success,
      message: success
        ? 'Test email sent successfully!'
        : 'Failed to send test email. Check logs for details.',
    };
  }
}

