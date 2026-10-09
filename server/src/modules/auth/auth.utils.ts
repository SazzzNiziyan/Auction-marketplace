import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { env } from '../../config/env';
import { JwtPayload } from '../../middleware/auth';
import { UserRole } from '@prisma/client';

export const passwordUtils = {
  hash: (plain: string): Promise<string> =>
    bcrypt.hash(plain, parseInt(env.BCRYPT_ROUNDS)),
  verify: (plain: string, hash: string): Promise<boolean> =>
    bcrypt.compare(plain, hash),
};

export const tokenUtils = {
  generateAccessToken: (payload: Omit<JwtPayload, 'iat' | 'exp'>): string =>
    jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] }),

  generateRefreshToken: (payload: Omit<JwtPayload, 'iat' | 'exp'>): string =>
    jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] }),

  verifyRefreshToken: (token: string): JwtPayload =>
    jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload,

  generateEmailToken: (): string => uuidv4().replace(/-/g, ''),

  generateResetToken: (): string => crypto.randomBytes(32).toString('hex'),
};

export const emailTokenExpiryMs = 24 * 60 * 60 * 1000;  // 24h
export const resetTokenExpiryMs = 60 * 60 * 1000;        // 1h
