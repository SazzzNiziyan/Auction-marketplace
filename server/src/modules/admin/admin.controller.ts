import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { adminService } from './admin.service';
import { ValidationError } from '../../utils/errors';

export const adminController = {
  getKPIs: asyncHandler(async (_req: Request, res: Response) => {
    const data = await adminService.getKPIs();
    res.json({ success: true, data });
  }),

  getSellerApplications: asyncHandler(async (_req: Request, res: Response) => {
    const data = await adminService.getSellerApplications();
    res.json({ success: true, data });
  }),

  reviewSellerApplication: asyncHandler(async (req: Request, res: Response) => {
    const { decision, note } = req.body;
    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      throw new ValidationError('Decision must be APPROVED or REJECTED');
    }
    const appId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await adminService.reviewSellerApplication(req.user!.sub, appId, decision, note);
    res.json({ success: true, data });
  }),

  getModerationQueue: asyncHandler(async (_req: Request, res: Response) => {
    const data = await adminService.getModerationQueue();
    res.json({ success: true, data });
  }),

  decideListingModeration: asyncHandler(async (req: Request, res: Response) => {
    const { decision, reason } = req.body;
    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      throw new ValidationError('Decision must be APPROVED or REJECTED');
    }
    const listingId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await adminService.decideListingModeration(req.user!.sub, listingId, decision, reason);
    res.json({ success: true, data });
  }),

  getLiveAuctions: asyncHandler(async (_req: Request, res: Response) => {
    const data = await adminService.getLiveAuctions();
    res.json({ success: true, data });
  }),

  emergencyCancelAuction: asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;
    if (!reason) throw new ValidationError('Reason is required for emergency action');
    const auctionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await adminService.emergencyAuctionAction(req.user!.sub, auctionId, 'CANCEL', reason);
    res.json({ success: true, data });
  }),

  getDisputes: asyncHandler(async (_req: Request, res: Response) => {
    const data = await adminService.getDisputes();
    res.json({ success: true, data });
  }),

  adjudicateDispute: asyncHandler(async (req: Request, res: Response) => {
    const { approve, reason } = req.body;
    if (typeof approve !== 'boolean' || !reason) throw new ValidationError('approve (boolean) and reason required');
    const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await adminService.adjudicateDispute(req.user!.sub, orderId, approve, reason);
    res.json({ success: true, data });
  }),

  getAuditLogs: asyncHandler(async (_req: Request, res: Response) => {
    const data = await adminService.getAuditLogs();
    res.json({ success: true, data });
  }),

  exportCSV: asyncHandler(async (req: Request, res: Response) => {
    const type = (req.query.type as string) || 'orders';
    if (type !== 'orders' && type !== 'auctions' && type !== 'users') {
      throw new ValidationError('Invalid export type. Must be orders, auctions, or users');
    }
    const csv = await adminService.exportDataCSV(type);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="auctio_${type}_export.csv"`);
    res.send(csv);
  }),

  getUsers: asyncHandler(async (req: Request, res: Response) => {
    const data = await adminService.getUsers({
      search: req.query.search as string | undefined,
      role: req.query.role as string | undefined,
      status: req.query.status as string | undefined,
    });
    res.json({ success: true, data });
  }),

  updateUserStatus: asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
    if (status !== 'ACTIVE' && status !== 'SUSPENDED') {
      throw new ValidationError('Status must be ACTIVE or SUSPENDED');
    }
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await adminService.updateUserStatus(req.user!.sub, userId, status);
    res.json({ success: true, data });
  }),

  getOrders: asyncHandler(async (req: Request, res: Response) => {
    const data = await adminService.getOrders(req.query.status as string | undefined);
    res.json({ success: true, data });
  }),

  getSettings: asyncHandler(async (_req: Request, res: Response) => {
    const data = await adminService.getSettings();
    res.json({ success: true, data });
  }),

  updateSettings: asyncHandler(async (req: Request, res: Response) => {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw new ValidationError('settings must be an object of key/value pairs');
    }
    const data = await adminService.updateSettings(req.user!.sub, settings);
    res.json({ success: true, data });
  }),

  getCategories: asyncHandler(async (_req: Request, res: Response) => {
    const data = await adminService.getCategories();
    res.json({ success: true, data });
  }),

  createCategory: asyncHandler(async (req: Request, res: Response) => {
    const { name, slug, description, imageUrl, sortOrder } = req.body;
    if (!name || typeof name !== 'string' || !slug || typeof slug !== 'string') {
      throw new ValidationError('name and slug are required');
    }
    const data = await adminService.createCategory(req.user!.sub, { name, slug, description, imageUrl, sortOrder });
    res.status(201).json({ success: true, data });
  }),

  updateCategory: asyncHandler(async (req: Request, res: Response) => {
    const categoryId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name, description, imageUrl, sortOrder, isActive } = req.body;
    const data = await adminService.updateCategory(req.user!.sub, categoryId, { name, description, imageUrl, sortOrder, isActive });
    res.json({ success: true, data });
  }),
};
