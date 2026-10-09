import prisma from '../../config/database';
import { RegisterInput, LoginInput } from './auth.schemas';
import { passwordUtils, tokenUtils, emailTokenExpiryMs, resetTokenExpiryMs } from './auth.utils';
import {
  ConflictError,
  AuthenticationError,
  NotFoundError,
  UnprocessableError,
} from '../../utils/errors';
import { UserRole, UserStatus } from '@prisma/client';
import { JwtPayload } from '../../middleware/auth';

export class AuthService {
  async register(input: RegisterInput) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) throw new ConflictError('An account with this email already exists');

    const passwordHash = await passwordUtils.hash(input.password);
    const emailToken = tokenUtils.generateEmailToken();
    const tokenExpiry = new Date(Date.now() + emailTokenExpiryMs);

    // In development mode, auto-activate user so registration works immediately
    const isDev = process.env.NODE_ENV !== 'production';
    const status = isDev ? UserStatus.ACTIVE : UserStatus.PENDING_VERIFICATION;
    const emailVerifiedAt = isDev ? new Date() : null;

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: UserRole.BUYER,
          status,
          emailVerifiedAt,
          profile: {
            create: { displayName: input.displayName },
          },
          emailVerifications: {
            create: {
              token: emailToken,
              expiresAt: tokenExpiry,
            },
          },
          notificationPrefs: { create: {} },
        },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      });
      return newUser;
    });

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = tokenUtils.generateAccessToken(payload);
    const refreshToken = tokenUtils.generateRefreshToken(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.profile?.displayName || input.displayName,
        avatarUrl: user.profile?.avatarUrl,
      },
      accessToken,
      refreshToken,
      emailToken,
    };
  }

  async verifyEmail(token: string) {
    const verification = await prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) throw new NotFoundError('Verification token');
    if (verification.usedAt) throw new UnprocessableError('Token already used');
    if (verification.expiresAt < new Date()) throw new UnprocessableError('Token expired');

    await prisma.$transaction([
      prisma.emailVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: verification.userId },
        data: {
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      }),
    ]);

    return { message: 'Email verified successfully' };
  }

  async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        status: true,
        profile: { select: { displayName: true, avatarUrl: true } },
      },
    });

    if (!user) throw new AuthenticationError('Invalid email or password');

    const passwordMatch = await passwordUtils.verify(input.password, user.passwordHash);
    if (!passwordMatch) throw new AuthenticationError('Invalid email or password');

    if (user.status === UserStatus.PENDING_VERIFICATION) {
      if (process.env.NODE_ENV !== 'production') {
        await prisma.user.update({
          where: { id: user.id },
          data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
        });
        user.status = UserStatus.ACTIVE;
      } else {
        throw new AuthenticationError('Please verify your email address first');
      }
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new AuthenticationError('Your account has been suspended');
    }
    if (user.status === UserStatus.DEACTIVATED) {
      throw new AuthenticationError('Your account has been deactivated');
    }

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = tokenUtils.generateAccessToken(payload);
    const refreshToken = tokenUtils.generateRefreshToken(payload);
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.$transaction([
      prisma.session.create({
        data: {
          userId: user.id,
          refreshToken,
          userAgent: userAgent ?? null,
          ipAddress: ipAddress ?? null,
          expiresAt: refreshExpiry,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.profile?.displayName || user.email.split('@')[0],
        avatarUrl: user.profile?.avatarUrl,
      },
    };
  }

  async refresh(token: string) {
    let decoded: JwtPayload;
    try {
      decoded = tokenUtils.verifyRefreshToken(token);
    } catch {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    const session = await prisma.session.findUnique({ where: { refreshToken: token } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new AuthenticationError('Session expired, please login again');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, role: true, status: true, profile: { select: { displayName: true, avatarUrl: true } } },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AuthenticationError('Account not active');
    }

    const newPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Rotate: revoke old session, issue new tokens
    const newAccessToken = tokenUtils.generateAccessToken(newPayload);
    const newRefreshToken = tokenUtils.generateRefreshToken(newPayload);
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } }),
      prisma.session.create({
        data: {
          userId: user.id,
          refreshToken: newRefreshToken,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          expiresAt: refreshExpiry,
        },
      }),
    ]);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.profile?.displayName || user.email.split('@')[0],
        avatarUrl: user.profile?.avatarUrl,
      },
    };
  }

  async logout(token: string) {
    await prisma.session.updateMany({
      where: { refreshToken: token },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If that email exists, a reset link has been sent' };

    const resetToken = tokenUtils.generateResetToken();
    const expiry = new Date(Date.now() + resetTokenExpiryMs);

    await prisma.passwordReset.create({
      data: { userId: user.id, token: resetToken, expiresAt: expiry },
    });

    // TODO: Send reset email
    return { message: 'If that email exists, a reset link has been sent', resetToken };
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await prisma.passwordReset.findUnique({ where: { token } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new UnprocessableError('Invalid or expired reset token');
    }

    const hash = await passwordUtils.hash(newPassword);

    await prisma.$transaction([
      prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: hash } }),
      // Revoke all sessions for security
      prisma.session.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password reset successfully' };
  }
}

export const authService = new AuthService();
