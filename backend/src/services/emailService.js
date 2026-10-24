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
 * Sends a password reset email with a cryptographically secure single-use link
 */
export async function sendPasswordResetLinkEmail({ email, name = 'User', resetUrl, expiresMinutes = 60 }) {
  const subject = 'Reset Your SocialSync AI Password';
  const textContent = `Hello ${name},

We received a request to reset your password for SocialSync AI.

Please click the secure link below to choose a new password:
${resetUrl}

This link is valid for ${expiresMinutes} minutes and can only be used once.

If you did not request a password reset, please ignore this email or reach out to support. Your password will remain unchanged.

Best regards,
The SocialSync AI Security Team`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your SocialSync AI Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; margin: 0; padding: 24px; color: #f8fafc; }
    .card { max-width: 540px; margin: 0 auto; background-color: #111827; border: 1px solid #1e293b; border-radius: 20px; padding: 40px 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .logo-container { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .logo-badge { background: linear-gradient(135deg, #3B5BFF 0%, #7C3AED 100%); color: #ffffff; font-weight: 800; font-size: 18px; padding: 6px 12px; border-radius: 8px; display: inline-block; letter-spacing: -0.5px; }
    .logo-text { font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
    .title { font-size: 24px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .message { font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 28px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #3B5BFF 0%, #7C3AED 100%); color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(59, 91, 255, 0.35); }
    .alt-link { font-size: 12px; color: #94a3b8; word-break: break-all; line-height: 1.5; background-color: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #1e293b; margin-top: 16px; }
    .warning { font-size: 12px; line-height: 1.5; color: #94a3b8; background-color: rgba(59, 91, 255, 0.12); border-left: 3px solid #3B5BFF; padding: 12px 14px; border-radius: 6px; margin: 24px 0; }
    .footer { font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; padding-top: 24px; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-container">
      <span class="logo-badge">SS</span>
      <span class="logo-text">SocialSync <span style="color:#3B5BFF;">AI</span></span>
    </div>
    <div class="title">Password Reset Request</div>
    <div class="message">
      Hello <strong>${name}</strong>,<br><br>
      We received a request to reset the password for your SocialSync AI account. Click the button below to choose a new password.
    </div>

    <div class="btn-container">
      <a href="${resetUrl}" target="_blank" class="btn">Reset Password</a>
    </div>

    <div class="warning">
      🔒 <strong>Security Details:</strong>
      <ul style="margin: 6px 0 0 16px; padding: 0;">
        <li>This single-use link expires in <strong>${expiresMinutes} minutes</strong>.</li>
        <li>Existing active sessions will be invalidated for your protection once updated.</li>
        <li>If you did not make this request, you can safely ignore this email.</li>
      </ul>
    </div>

    <div style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
      If the button above does not work, copy and paste this link into your browser:
      <div class="alt-link">${resetUrl}</div>
    </div>

    <div class="footer">
      &copy; ${new Date().getFullYear()} SocialSync AI. All rights reserved.<br>
      Enterprise-Grade Social Media Orchestration
    </div>
  </div>
</body>
</html>`;

  const emailRecord = {
    to: email,
    subject,
    resetUrl,
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
      console.log(`[EmailService] Password reset link sent to ${email}`);
    } catch (err) {
      console.error(`[EmailService] Failed to send email via SMTP to ${email}:`, err.message);
    }
  } else {
    console.log(`[EmailService:DevMode] Password reset link generated for ${email}: ${resetUrl}`);
  }

  return { success: true, email };
}

/**
 * Sends a notification email to Google-only users who attempted a local password reset
 */
export async function sendGoogleAccountNoticeEmail({ email, name = 'User', loginUrl, setupPasswordUrl }) {
  const subject = 'Your SocialSync AI Account: Signed up with Google';
  const textContent = `Hello ${name},

We received a password reset request for your SocialSync AI account.

Your account was created using Google Sign-In and does not currently have a separate password. You can sign in immediately using the "Continue with Google" button at:
${loginUrl}

${setupPasswordUrl ? `If you would like to set up a separate password, click here:\n${setupPasswordUrl}\n` : ''}
Best regards,
The SocialSync AI Security Team`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SocialSync AI - Google Account Notice</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1120; margin: 0; padding: 24px; color: #f8fafc; }
    .card { max-width: 520px; margin: 0 auto; background-color: #111827; border: 1px solid #1e293b; border-radius: 20px; padding: 36px 32px; }
    .title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .message { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }
    .google-box { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #3B5BFF 0%, #7C3AED 100%); color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 18px; font-weight: 800; color: #3B5BFF; margin-bottom: 20px;">SOCIALSYNC AI</div>
    <div class="title">Google Sign-In Account</div>
    <div class="message">
      Hello <strong>${name}</strong>,<br><br>
      We received a password reset request for this email address. Your SocialSync AI account was created using <strong>Google Sign-In</strong> and does not have a local password.
    </div>
    <div class="google-box">
      <div style="font-size: 13px; color: #94a3b8; margin-bottom: 14px;">
        To access your account, simply use the <strong>Continue with Google</strong> button on the login page.
      </div>
      <a href="${loginUrl}" class="btn">Go to Login with Google</a>
    </div>
    ${setupPasswordUrl ? `
    <div style="font-size: 12px; color: #94a3b8; margin-top: 16px;">
      Want to set up a local password? <a href="${setupPasswordUrl}" style="color: #3B5BFF;">Click here to create a password</a>.
    </div>` : ''}
  </div>
</body>
</html>`;

  const emailRecord = {
    to: email,
    subject,
    type: 'GOOGLE_NOTICE',
    timestamp: new Date()
  };
  sentEmailsMemoryStore.unshift(emailRecord);

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
      console.error(`[EmailService] Failed to send Google account notice:`, err.message);
    }
  } else {
    console.log(`[EmailService:DevMode] Google account notice dispatched to ${email}`);
  }

  return { success: true, email };
}

/**
 * Verify transporter connectivity
 */
export async function verifyEmailTransporter() {
  if (!config.smtp.isConfigured) {
    return { configured: false, connected: false, message: 'SMTP credentials not configured. Operating in safe test/dev fallback mode.' };
  }
  const transporter = createTransporter();
  try {
    await transporter.verify();
    return { configured: true, connected: true, message: 'SMTP connection verified successfully.' };
  } catch (err) {
    return { configured: true, connected: false, error: err.message };
  }
}

/**
 * Sends a secure administrative invitation email with acceptance link
 */
export async function sendAdminInvitationEmail({ email, inviteUrl, role = 'ADMIN', invitedByName = 'Super Administrator', expiresHours = 48 }) {
  const roleDisplay = role === 'SUPER_ADMIN' ? 'Super Administrator' : role === 'SUPPORT_ADMIN' ? 'Support Administrator' : 'Administrator';
  const subject = `You've been invited to join SocialSync AI as a ${roleDisplay}`;

  const textContent = `Hello,

You have been invited by ${invitedByName} to join SocialSync AI Governance Portal as an official ${roleDisplay}.

To accept this invitation and activate your administrative access, please visit the secure link below:
${inviteUrl}

This single-use invitation link is valid for ${expiresHours} hours.

If you were not expecting this invitation, please disregard this email.

Best regards,
SocialSync AI Security & Governance`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SocialSync AI Administrator Invitation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; margin: 0; padding: 24px; color: #f8fafc; }
    .card { max-width: 540px; margin: 0 auto; background-color: #111827; border: 1px solid #1e293b; border-radius: 24px; padding: 40px 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
    .brand { font-size: 22px; font-weight: 800; color: #3B5BFF; letter-spacing: -0.5px; margin-bottom: 24px; text-transform: uppercase; }
    .title { font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 12px; }
    .role-badge { display: inline-block; padding: 6px 14px; background: rgba(59, 91, 255, 0.15); border: 1px solid rgba(59, 91, 255, 0.35); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #3B5BFF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px; }
    .message { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 28px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #3B5BFF 0%, #7C3AED 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 15px rgba(59, 91, 255, 0.3); }
    .btn:hover { opacity: 0.95; }
    .security-note { font-size: 11px; line-height: 1.5; color: #94a3b8; background-color: rgba(15, 23, 42, 0.8); border: 1px solid #334155; padding: 14px 16px; border-radius: 12px; margin-bottom: 24px; }
    .footer { font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">SocialSync <span style="color:#ffffff;">AI</span></div>
    <div class="role-badge">Governance Invitation: ${roleDisplay}</div>
    <div class="title">Administrator Access Invitation</div>
    <div class="message">
      Hello,<br><br>
      You have been officially invited by <strong>${invitedByName}</strong> to join the administrative team for <strong>SocialSync AI</strong> as a <strong>${roleDisplay}</strong>.
    </div>

    <div class="btn-container">
      <a href="${inviteUrl}" class="btn" target="_blank">Accept Invitation & Activate Access</a>
    </div>

    <div class="security-note">
      🔒 <strong>Security Details:</strong>
      <ul style="margin: 6px 0 0 0; padding-left: 18px;">
        <li>This single-use cryptographic invitation link expires in <strong>${expiresHours} hours</strong>.</li>
        <li>You will be prompted to set your password or verify your existing account to activate access.</li>
        <li>If you did not request or expect this administrative invitation, you can safely ignore this email.</li>
      </ul>
    </div>

    <div class="footer">
      &copy; ${new Date().getFullYear()} SocialSync AI Governance Portal. All rights reserved.
    </div>
  </div>
</body>
</html>`;

  const emailRecord = {
    to: email,
    subject,
    inviteUrl,
    role,
    expiresHours,
    timestamp: new Date()
  };
  sentEmailsMemoryStore.unshift(emailRecord);
  if (sentEmailsMemoryStore.length > 50) sentEmailsMemoryStore.pop();

  const transporter = createTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: config.smtp.from || `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
        to: email,
        subject,
        text: textContent,
        html: htmlContent
      });
      return { success: true, mode: 'smtp' };
    } catch (err) {
      console.warn(`[EmailService] Failed to send email via SMTP to ${email}:`, err.message);
      return { success: true, mode: 'simulated_after_smtp_failure', error: err.message };
    }
  }

  console.log(`[EmailService:DevMode] Admin invitation link dispatched to ${email}: ${inviteUrl}`);
  return { success: true, mode: 'simulated' };
}

/**
 * Helper for automated tests and development inspections
 */
export function getLatestOtpForEmail(email) {
  const match = sentEmailsMemoryStore.find(e => e.to.toLowerCase() === email.toLowerCase() && e.otp);
  return match ? match.otp : null;
}

/**
 * Helper to retrieve latest reset URL for an email (used in test suite)
 */
export function getLatestResetLinkForEmail(email) {
  const match = sentEmailsMemoryStore.find(e => e.to.toLowerCase() === email.toLowerCase() && e.resetUrl);
  return match ? match.resetUrl : null;
}

/**
 * Helper to retrieve latest admin invite URL for an email
 */
export function getLatestAdminInviteForEmail(email) {
  const match = sentEmailsMemoryStore.find(e => e.to.toLowerCase() === email.toLowerCase() && e.inviteUrl);
  return match ? match.inviteUrl : null;
}

/**
 * Clears memory store (used in test setup)
 */
export function clearSentEmailsStore() {
  sentEmailsMemoryStore.length = 0;
}
