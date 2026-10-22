import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

// In-memory registry for automated tests and development verification
const sentEmailsMemoryStore = [];

/**
 * Creates or retrieves the active nodemailer transporter
 */
function createTransporter() {
  if (config.smtp.isConfigured) {
    return nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass
      }
    });
  }
  return null;
}

/**
 * Sends a password reset OTP verification email
 */
export async function sendPasswordResetOtpEmail({ email, name = 'User', otp, expiresMinutes = 5 }) {
  const subject = `Your SocialSync AI Password Reset Code: ${otp}`;
  const textContent = `Hello ${name},

You requested to reset your password for SocialSync AI.

Your 6-digit verification code is: ${otp}

This code will expire in ${expiresMinutes} minutes and can only be used once.
If you did not request this password reset, please ignore this email or secure your account.

Best regards,
The SocialSync AI Security Team`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SocialSync AI Password Reset</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; margin: 0; padding: 24px; color: #f8fafc; }
    .card { max-width: 520px; margin: 0 auto; background-color: #111827; border: 1px solid #334155; border-radius: 20px; padding: 36px 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .logo { font-size: 20px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px; margin-bottom: 24px; text-transform: uppercase; }
    .title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .message { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 28px; }
    .otp-box { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 2px dashed #0284c7; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 28px; }
    .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: monospace; }
    .warning { font-size: 12px; line-height: 1.5; color: #94a3b8; background-color: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 12px 14px; border-radius: 6px; margin-bottom: 24px; }
    .footer { font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">SocialSync <span style="color:#ffffff;">AI</span></div>
    <div class="title">Password Reset Verification</div>
    <div class="message">
      Hello <strong>${name}</strong>,<br><br>
      We received a request to reset the password for your SocialSync AI account. Enter the verification code below to proceed with setting a new password.
    </div>
    
    <div class="otp-box">
      <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px;">One-Time Verification Code</div>
      <div class="otp-code">${otp}</div>
    </div>

    <div class="warning">
      ⚠️ <strong>Security Notice:</strong> This code expires in <strong>${expiresMinutes} minutes</strong> and is valid for a single use only. Never share this code with anyone. SocialSync AI administrators will never ask for your code.
    </div>

    <div class="footer">
      If you did not request this password reset, please disregard this email. Your password will remain unchanged.<br><br>
      &copy; ${new Date().getFullYear()} SocialSync AI. All rights reserved.
    </div>
  </div>
</body>
</html>`;

  // Always store in development/test registry
  const emailRecord = {
    to: email,
    subject,
    otp,
    expiresMinutes,
    timestamp: new Date()
  };
  sentEmailsMemoryStore.unshift(emailRecord);
  if (sentEmailsMemoryStore.length > 50) sentEmailsMemoryStore.pop();

  const transporter = createTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: config.smtp.from,
        to: email,
        subject,
        text: textContent,
        html: htmlContent
      });
      console.log(`[EmailService] Password reset OTP sent to ${email}`);
    } catch (err) {
      console.error(`[EmailService] Failed to send email via SMTP to ${email}:`, err.message);
      // Fallback is maintained in sentEmailsMemoryStore
    }
  } else {
    console.log(`[EmailService:DevMode] Simulated OTP dispatch to ${email}: [OTP: ${otp}]`);
  }

  return { success: true, email };
}

/**
 * Sends a confirmation email after a password has been reset successfully
 */
export async function sendPasswordResetSuccessEmail({ email, name = 'User' }) {
  const subject = 'Your SocialSync AI password has been updated';
  const textContent = `Hello ${name},

Your password for SocialSync AI was successfully changed on ${new Date().toUTCString()}.

If you made this change, no further action is needed.
If you did NOT make this change, please contact our support team immediately.

Best regards,
The SocialSync AI Security Team`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Changed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1120; margin: 0; padding: 24px; color: #f8fafc; }
    .card { max-width: 500px; margin: 0 auto; background-color: #111827; border: 1px solid #334155; border-radius: 20px; padding: 36px 32px; }
    .title { font-size: 20px; font-weight: 700; color: #10b981; margin-bottom: 12px; }
    .message { font-size: 14px; line-height: 1.6; color: #cbd5e1; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 18px; font-weight: 800; color: #38bdf8; margin-bottom: 20px;">SOCIALSYNC AI</div>
    <div class="title">✓ Password Successfully Reset</div>
    <p class="message">
      Hello ${name},<br><br>
      Your SocialSync AI account password was successfully updated on <strong>${new Date().toUTCString()}</strong>.
      Existing active sessions have been invalidated across all devices for your protection.
      <br><br>
      If you performed this reset, you can now log in securely with your new password. If you did not make this change, please reach out to our security team right away.
    </p>
  </div>
</body>
</html>`;

  const transporter = createTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: config.smtp.from,
        to: email,
        subject,
        text: textContent,
        html: htmlContent
      });
    } catch (err) {
      console.error(`[EmailService] Failed to send password reset success email:`, err.message);
    }
  }

  return { success: true };
}

/**
 * Helper for automated tests and development inspections
 */
export function getLatestOtpForEmail(email) {
  const match = sentEmailsMemoryStore.find(e => e.to.toLowerCase() === email.toLowerCase());
  return match ? match.otp : null;
}

/**
 * Clears memory store (used in test setup)
 */
export function clearSentEmailsStore() {
  sentEmailsMemoryStore.length = 0;
}
