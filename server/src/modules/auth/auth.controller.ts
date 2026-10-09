import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schemas';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { body } = registerSchema.parse({ body: req.body });
    const result = await authService.register(body);
    res.status(201).json({
      success: true,
      message: 'Registration successful. Welcome to Auctio!',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  }),

  verifyEmail: asyncHandler(async (req: Request, res: Response) => {
    const { params } = verifyEmailSchema.parse({ params: req.params });
    const result = await authService.verifyEmail(params.token);
    res.json({ success: true, ...result });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { body } = loginSchema.parse({ body: req.body });
    const result = await authService.login(body, req.ip, req.get('user-agent'));
    res.json({ success: true, data: result });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const { body } = refreshSchema.parse({ body: req.body });
    const result = await authService.refresh(body.refreshToken);
    res.json({ success: true, data: result });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const { body } = refreshSchema.parse({ body: req.body });
    const result = await authService.logout(body.refreshToken);
    res.json({ success: true, ...result });
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const { body } = forgotPasswordSchema.parse({ body: req.body });
    const result = await authService.forgotPassword(body.email);
    res.json({ success: true, ...result });
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const { body } = resetPasswordSchema.parse({ body: req.body });
    const result = await authService.resetPassword(body.token, body.password);
    res.json({ success: true, ...result });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: { user: req.user } });
  }),
};
