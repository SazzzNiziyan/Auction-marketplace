import nodemailer from 'nodemailer';
import { env } from '../config/env';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || 'localhost',
  port: parseInt(env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
  },
});

export async function sendEmail({ to, subject, html, text }: MailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `"Auctio" <${env.FROM_EMAIL}>`,
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]+>/g, ''),
    });
    console.log(`[Email] Sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Email] Failed to send:', err);
    return { success: false, error: err };
  }
}

export function verificationEmail(displayName: string, token: string) {
  const link = `${env.CORS_ORIGIN}/auth/verify?token=${token}`;
  return {
    subject: 'Verify your Auctio account',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#7c3aed">Welcome to Auctio, ${displayName}!</h2>
        <p>Please verify your email address to activate your account.</p>
        <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Verify Email
        </a>
        <p style="color:#888;font-size:14px">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>`,
  };
}

export function resetPasswordEmail(displayName: string, token: string) {
  const link = `${env.CORS_ORIGIN}/auth/reset-password?token=${token}`;
  return {
    subject: 'Reset your Auctio password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#7c3aed">Password Reset</h2>
        <p>Hi ${displayName}, we received a request to reset your password.</p>
        <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#888;font-size:14px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>`,
  };
}

export function sellerApprovedEmail(displayName: string) {
  return {
    subject: 'Your seller application has been approved! 🎉',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#7c3aed">Congratulations, ${displayName}!</h2>
        <p>Your seller application has been approved. You can now create listings on Auctio.</p>
        <a href="${env.CORS_ORIGIN}/seller/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Go to Seller Dashboard
        </a>
      </div>`,
  };
}

export function outbidEmail(displayName: string, auctionTitle: string, currentBid: number, auctionId: string) {
  const link = `${env.CORS_ORIGIN}/auction/${auctionId}`;
  return {
    subject: `You've been outbid on "${auctionTitle}"`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#f59e0b">You've been outbid!</h2>
        <p>Hi ${displayName}, someone placed a higher bid on <strong>${auctionTitle}</strong>.</p>
        <p>Current bid: <strong>₹${(currentBid / 100).toLocaleString('en-IN')}</strong></p>
        <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#000;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">
          Bid Again
        </a>
      </div>`,
  };
}

export function auctionWonEmail(displayName: string, auctionTitle: string, winningBid: number, auctionId: string) {
  const link = `${env.CORS_ORIGIN}/auction/${auctionId}/checkout`;
  return {
    subject: `You won the auction for "${auctionTitle}"! 🏆`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#10b981">You won! 🏆</h2>
        <p>Hi ${displayName}, congratulations! You won <strong>${auctionTitle}</strong>.</p>
        <p>Winning bid: <strong>₹${(winningBid / 100).toLocaleString('en-IN')}</strong></p>
        <p><strong>Please complete your payment within 24 hours</strong> to secure your item.</p>
        <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Complete Payment
        </a>
      </div>`,
  };
}
