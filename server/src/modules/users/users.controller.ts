import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { usersService } from './users.service';
import { updateProfileSchema, changePasswordSchema } from './users.schemas';
import { ValidationError } from '../../utils/errors';

export const usersController = {
  getMe: asyncHandler(async (req: Request, res: Response) => {
    const profile = await usersService.getProfile(req.user!.sub);
    res.json({ success: true, data: profile });
  }),

  getPublicProfile: asyncHandler(async (req: Request, res: Response) => {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const profile = await usersService.getPublicProfile(userId);
    res.json({ success: true, data: profile });
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message || 'Validation failed');
    const profile = await usersService.updateProfile(req.user!.sub, parsed.data);
    res.json({ success: true, data: profile });
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message || 'Validation failed');
    const result = await usersService.changePassword(req.user!.sub, parsed.data);
    res.json({ success: true, ...result });
  }),

  getWatchlist: asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const result = await usersService.getWatchlist(req.user!.sub, page, limit);
    res.json({ success: true, data: result });
  }),

  addToWatchlist: asyncHandler(async (req: Request, res: Response) => {
    const listingId = Array.isArray(req.params.listingId) ? req.params.listingId[0] : req.params.listingId;
    const result = await usersService.addToWatchlist(req.user!.sub, listingId);
    res.status(201).json({ success: true, ...result });
  }),

  removeFromWatchlist: asyncHandler(async (req: Request, res: Response) => {
    const listingId = Array.isArray(req.params.listingId) ? req.params.listingId[0] : req.params.listingId;
    const result = await usersService.removeFromWatchlist(req.user!.sub, listingId);
    res.json({ success: true, ...result });
  }),

  getNotifications: asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const result = await usersService.getNotifications(req.user!.sub, page);
    res.json({ success: true, data: result });
  }),

  markNotificationsRead: asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;
    const result = await usersService.markNotificationsRead(req.user!.sub, ids);
    res.json({ success: true, ...result });
  }),

  getFollowedSellers: asyncHandler(async (req: Request, res: Response) => {
    const result = await usersService.getFollowedSellers(req.user!.sub);
    res.json({ success: true, data: result });
  }),

  getUserBids: asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const result = await usersService.getUserBids(req.user!.sub, page, limit);
    res.json({ success: true, data: result });
  }),
};
