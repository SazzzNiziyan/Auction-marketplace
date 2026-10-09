import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { auctionsService } from './auctions.service';
import { placeBidSchema, setAutoBidSchema, cautionDepositSchema } from './auctions.schemas';
import { ValidationError } from '../../utils/errors';

export const auctionsController = {
  getAuction: asyncHandler(async (req: Request, res: Response) => {
    const auctionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const currentUserId = req.user?.sub;
    const data = await auctionsService.getAuctionById(auctionId, currentUserId);
    res.json({ success: true, data });
  }),

  payCautionDeposit: asyncHandler(async (req: Request, res: Response) => {
    const auctionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = cautionDepositSchema.safeParse(req.body);
    const result = await auctionsService.payCautionDeposit(auctionId, req.user!.sub, parsed.success ? parsed.data : {});
    res.json({ success: true, ...result });
  }),

  placeBid: asyncHandler(async (req: Request, res: Response) => {
    const auctionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = placeBidSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid bid amount');
    const result = await auctionsService.placeBid(auctionId, req.user!.sub, parsed.data, req.ip, req.headers['user-agent']);
    res.status(201).json({ success: true, ...result });
  }),

  setAutoBid: asyncHandler(async (req: Request, res: Response) => {
    const auctionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = setAutoBidSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid auto-bid config');
    const result = await auctionsService.setAutoBid(auctionId, req.user!.sub, parsed.data);
    res.json({ success: true, ...result });
  }),

  closeAuction: asyncHandler(async (req: Request, res: Response) => {
    const auctionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await auctionsService.closeAuction(auctionId);
    res.json({ success: true, ...result });
  }),
};
