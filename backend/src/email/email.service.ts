import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const secure = this.configService.get<boolean>('SMTP_SECURE', false);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn('SMTP configuration incomplete. Email service will not work.');
      return;
    }

    // Remove spaces from App Password (Gmail App Passwords sometimes have spaces)
    const cleanPass = pass.replace(/\s+/g, '');

    // Gmail SMTP configuration - use port 465 with SSL (more reliable)
    const isGmail = host === 'smtp.gmail.com';
    const usePort = isGmail ? 465 : port;
    const useSecure = isGmail ? true : secure;

    this.transporter = nodemailer.createTransport({
      service: isGmail ? 'gmail' : undefined, // Use 'gmail' service for automatic config
      host: isGmail ? undefined : host, // Don't set host if using service
      port: isGmail ? undefined : usePort, // Don't set port if using service
      secure: useSecure,
      auth: {
        user,
        pass: cleanPass,
      },
    });

    this.logger.log(`Email transporter initialized (${isGmail ? 'gmail service' : `${host}:${usePort}`}, secure: ${useSecure})`);
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<boolean> {
    if (!this.transporter) {
      this.logger.error('Email transporter not initialized');
      return false;
    }

    const fromEmail = this.configService.get<string>('SMTP_FROM', 'noreply@metavr.com');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME', 'MetaVR Team');

    try {
      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
      });

      this.logger.log(`Email sent successfully to ${options.to}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendAccessCodeEmail(
    email: string,
    name: string,
    appName: string,
    accessCode: string,
  ): Promise<boolean> {
    const subject = `Your Access Code for ${appName}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .code-box { background-color: #fff; border: 2px solid #4F46E5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #4F46E5; font-family: monospace; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>MetaVR Access Code</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Your request to access <strong>${appName}</strong> has been approved.</p>
              <div class="code-box">
                <p style="margin: 0 0 10px 0; color: #666;">Your access code:</p>
                <div class="code">${accessCode}</div>
              </div>
              <p>You can now use this code to access the application.</p>
              <p>If you have any questions, please contact your supervisor.</p>
            </div>
            <div class="footer">
              <p>Best regards,<br>MetaVR Team</p>
              <p>This is an automated message. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Hi ${name},

Your request to access ${appName} has been approved.

Your access code: ${accessCode}

You can now use this code to access the application.

Best regards,
MetaVR Team
    `;

    return this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  async sendRejectionEmail(
    email: string,
    name: string,
    appName: string,
  ): Promise<boolean> {
    const subject = `Access Request for ${appName}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Access Request Update</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Unfortunately, your request to access <strong>${appName}</strong> has been rejected.</p>
              <p>If you have any questions, please contact your supervisor.</p>
            </div>
            <div class="footer">
              <p>Best regards,<br>MetaVR Team</p>
              <p>This is an automated message. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Hi ${name},

Unfortunately, your request to access ${appName} has been rejected.

If you have any questions, please contact your supervisor.

Best regards,
MetaVR Team
    `;

    return this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  async sendSupervisorWelcomeEmail(
    email: string,
    name: string,
    password: string,
    apps: Array<{ appName: string; appKey: string; accessCode: string }>,
  ): Promise<boolean> {
    const subject = 'Welcome to MetaVR Supervisor Portal';
    const appListHtml =
      apps.length > 0
        ? `<table style="width:100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Application</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Access Code</th>
              </tr>
            </thead>
            <tbody>
              ${apps
                .map(
                  (app) => `
                    <tr>
                      <td style="padding: 8px; border: 1px solid #e5e7eb;">${app.appName || app.appKey}</td>
                      <td style="padding: 8px; border: 1px solid #e5e7eb; font-family: monospace;">${app.accessCode}</td>
                    </tr>
                  `,
                )
                .join('')}
            </tbody>
          </table>`
        : '<p>No applications have been assigned yet.</p>';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background-color: #f9fafb; padding: 24px; }
            .card { background-color: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
            .header { border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 16px; }
            .credentials { background-color: #f3f4f6; border-radius: 10px; padding: 16px; margin: 20px 0; }
            .footer { margin-top: 24px; font-size: 12px; color: #6b7280; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1 style="margin: 0;">Welcome, ${name || 'Supervisor'}!</h1>
              <p style="margin: 4px 0 0;">Your MetaVR Supervisor account has been created.</p>
            </div>

            <p>Use the credentials below to sign in to the supervisor portal:</p>

            <div class="credentials">
              <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 4px 0 0;"><strong>Temporary Password:</strong> ${password}</p>
              <p style="margin: 12px 0 0; font-size: 13px; color: #6b7280;">Please change your password after signing in for the first time.</p>
            </div>

            <p>Your initial access codes:</p>
            ${appListHtml}

            <p style="margin-top: 20px;">If you have any questions, please contact your administrator.</p>
          </div>
          <div class="footer">
            MetaVR Supervisor Portal • This is an automated message, please do not reply.
          </div>
        </body>
      </html>
    `;

    const text = `
Welcome ${name || 'Supervisor'},

Your MetaVR Supervisor account has been created.

Email: ${email}
Temporary Password: ${password}

Assigned Applications:
${apps.map((app) => `- ${app.appName || app.appKey}: ${app.accessCode}`).join('\n') || 'No applications assigned yet.'}

Please change your password after signing in and keep your access codes secure.
`;

    return this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  async sendSupervisorAccessCodeUpdate(
    email: string,
    name: string,
    appName: string,
    accessCode: string,
  ): Promise<boolean> {
    const subject = `Access Code Updated - ${appName}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background-color: #f9fafb; padding: 24px; }
            .card { background-color: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
            .code-box { background-color: #f3f4f6; border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 20px; font-family: monospace; text-align: center; letter-spacing: 4px; }
            .footer { margin-top: 24px; font-size: 12px; color: #6b7280; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1 style="margin-top:0;">Hi ${name || 'Supervisor'},</h1>
            <p>Your access code for <strong>${appName}</strong> has been updated. Use the new code below:</p>
            <div class="code-box">${accessCode}</div>
            <p>Please keep this code secure.</p>
          </div>
          <div class="footer">
            MetaVR Supervisor Portal • This is an automated message, please do not reply.
          </div>
        </body>
      </html>
    `;

    const text = `
Hi ${name || 'Supervisor'},

Your access code for ${appName} has been updated.
New code: ${accessCode}

Please keep this code secure.
`;

    return this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }
}

