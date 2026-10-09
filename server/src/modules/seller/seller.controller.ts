import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sellerService } from './seller.service';
import { applySellerSchema, updateSellerProfileSchema } from './seller.schemas';
import { ValidationError } from '../../utils/errors';

export const sellerController = {
  apply: asyncHandler(async (req: Request, res: Response) => {
    const parsed = applySellerSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid application data');
    const data = await sellerService.applyForSeller(req.user!.sub, parsed.data);
    res.status(201).json({ success: true, data });
  }),

  getMyApplication: asyncHandler(async (req: Request, res: Response) => {
    const data = await sellerService.getMyApplication(req.user!.sub);
    res.json({ success: true, data });
  }),

  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const data = await sellerService.getSellerProfile(req.user!.sub);
    res.json({ success: true, data });
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateSellerProfileSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid profile data');
    const data = await sellerService.updateSellerProfile(req.user!.sub, parsed.data);
    res.json({ success: true, data });
  }),

  getDashboard: asyncHandler(async (req: Request, res: Response) => {
    const data = await sellerService.getSellerDashboard(req.user!.sub);
    res.json({ success: true, data });
  }),

  getEarnings: asyncHandler(async (req: Request, res: Response) => {
    const data = await sellerService.getSellerEarnings(req.user!.sub);
    res.json({ success: true, data });
  }),

  getPublicStorefront: asyncHandler(async (req: Request, res: Response) => {
    const sellerId = Array.isArray(req.params.sellerId) ? req.params.sellerId[0] : req.params.sellerId;
    const data = await sellerService.getPublicStorefront(sellerId);
    res.json({ success: true, data });
  }),

  followSeller: asyncHandler(async (req: Request, res: Response) => {
    const sellerId = Array.isArray(req.params.sellerId) ? req.params.sellerId[0] : req.params.sellerId;
    const result = await sellerService.followSeller(req.user!.sub, sellerId);
    res.json({ success: true, ...result });
  }),

  unfollowSeller: asyncHandler(async (req: Request, res: Response) => {
    const sellerId = Array.isArray(req.params.sellerId) ? req.params.sellerId[0] : req.params.sellerId;
    const result = await sellerService.unfollowSeller(req.user!.sub, sellerId);
    res.json({ success: true, ...result });
  }),

  getInventory: asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const data = await sellerService.getInventory(req.user!.sub, { page, limit, status, search });
    res.json({ success: true, data });
  }),

  getDisputes: asyncHandler(async (req: Request, res: Response) => {
    const data = await sellerService.getDisputes(req.user!.sub);
    res.json({ success: true, data });
  }),

  respondToDispute: asyncHandler(async (req: Request, res: Response) => {
    const disputeId = Array.isArray(req.params.disputeId) ? req.params.disputeId[0] : req.params.disputeId;
    const { response, acceptRefund } = req.body;
    const data = await sellerService.respondToDispute(req.user!.sub, disputeId, response, acceptRefund);
    res.json({ success: true, ...data });
  }),
};
