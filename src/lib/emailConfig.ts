/** E-mail env ellenőrzés — kliens-bundle biztonságos (nincs nodemailer). */

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
}

export function isEmailSendingConfigured(): boolean {
  return isResendConfigured() || isSmtpConfigured();
}

export function getEmailFromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    'Robeo <onboarding@resend.dev>'
  );
}
