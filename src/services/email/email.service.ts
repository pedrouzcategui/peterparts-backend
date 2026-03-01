import type {
  IEmailProvider,
  SendEmailResult,
  SendOtpEmailOptions,
} from "./email.interface.ts";
import { ResendEmailProvider } from "./resend.provider.ts";
import {
  otpEmailTemplate,
  otpEmailTextTemplate,
  welcomeEmailTemplate,
  welcomeEmailTextTemplate,
} from "./templates/index.ts";

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
    const params = { ...(name && { name }) };
    const html = welcomeEmailTemplate(params);
    const text = welcomeEmailTextTemplate(params);

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
