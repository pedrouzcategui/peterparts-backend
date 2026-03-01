import type {
  IEmailProvider,
  SendEmailResult,
  SendOtpEmailOptions,
} from "./email.interface.ts";
import { ResendEmailProvider } from "./resend.provider.ts";
import { otpEmailTemplate, otpEmailTextTemplate } from "./templates/index.ts";

// Email Service - Dependency Injection Pattern
// To switch providers, just change the provider instance here

class EmailService {
  private provider: IEmailProvider;

  constructor(provider: IEmailProvider) {
    this.provider = provider;
  }

  setProvider(provider: IEmailProvider): void {
    this.provider = provider;
  }

  async sendOtpEmail(options: SendOtpEmailOptions): Promise<SendEmailResult> {
    const { to, code, expiresInMinutes } = options;

    const html = otpEmailTemplate({ code, expiresInMinutes });
    const text = otpEmailTextTemplate({ code, expiresInMinutes });

    return this.provider.send({
      to,
      subject: "Your PeterParts Verification Code",
      html,
      text,
    });
  }

  async sendWelcomeEmail(to: string, name?: string): Promise<SendEmailResult> {
    const displayName = name || "there";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to PeterParts</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Welcome to PeterParts!</h1>
          <p style="font-size: 16px; color: #666;">
            Hi ${displayName},
          </p>
          <p style="font-size: 16px; color: #666;">
            Thank you for joining PeterParts. We're excited to have you!
          </p>
          <p style="font-size: 16px; color: #666;">
            Start exploring our collection of premium Kitchenaid and Cuisinart gears and appliances.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">
            &copy; ${new Date().getFullYear()} PeterParts. All rights reserved.
          </p>
        </body>
      </html>
    `;

    const text = `Welcome to PeterParts, ${displayName}!\n\nThank you for joining PeterParts. We're excited to have you!\n\nStart exploring our collection of premium Kitchenaid and Cuisinart gears and appliances.`;

    return this.provider.send({
      to,
      subject: "Welcome to PeterParts!",
      html,
      text,
    });
  }
}

// Default email service instance with Resend provider
// To switch providers at runtime, use: emailService.setProvider(new OtherProvider())
const emailService = new EmailService(new ResendEmailProvider());

export default emailService;
export { EmailService };
