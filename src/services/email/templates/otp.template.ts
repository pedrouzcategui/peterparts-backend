export type OtpEmailParams = {
  code: string;
  expiresInMinutes: number;
};

export const otpEmailTemplate = (params: OtpEmailParams): string => {
  const { code, expiresInMinutes } = params;
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Your Verification Code</title>
  </head>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #333;">Your Verification Code</h1>
    <p style="font-size: 16px; color: #666;">
      Use the following code to verify your email address:
    </p>
    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">
        ${code}
      </span>
    </div>
    <p style="font-size: 14px; color: #999;">
      This code will expire in ${expiresInMinutes} minutes.
    </p>
    <p style="font-size: 14px; color: #999;">
      If you didn't request this code, you can safely ignore this email.
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="font-size: 12px; color: #999;">
      &copy; ${year} PeterParts. All rights reserved.
    </p>
  </body>
</html>`;
};

export const otpEmailTextTemplate = (params: OtpEmailParams): string => {
  const { code, expiresInMinutes } = params;

  return `Your verification code is: ${code}

This code will expire in ${expiresInMinutes} minutes.

If you didn't request this code, you can safely ignore this email.`;
};
