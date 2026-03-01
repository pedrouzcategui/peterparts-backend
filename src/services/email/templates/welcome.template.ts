export type WelcomeEmailParams = {
  name?: string;
};

export const welcomeEmailTemplate = (params: WelcomeEmailParams): string => {
  const displayName = params.name || "there";
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
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
      &copy; ${year} PeterParts. All rights reserved.
    </p>
  </body>
</html>`;
};

export const welcomeEmailTextTemplate = (
  params: WelcomeEmailParams,
): string => {
  const displayName = params.name || "there";

  return `Welcome to PeterParts, ${displayName}!

Thank you for joining PeterParts. We're excited to have you!

Start exploring our collection of premium Kitchenaid and Cuisinart gears and appliances.`;
};
