import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { catalogService } from './catalog.service';
import { createListingSchema, updateListingSchema, listingsQuerySchema } from './catalog.schemas';
import { ValidationError } from '../../utils/errors';
import { suggestListing } from '../../integrations/gemini';
import { getUploadAuth } from '../../integrations/imagekit';

export const catalogController = {
  // ── Categories ──
  getCategories: asyncHandler(async (_req: Request, res: Response) => {
    const data = await catalogService.getCategories();
    res.json({ success: true, data });
  }),

  getCategoryBySlug: asyncHandler(async (req: Request, res: Response) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const data = await catalogService.getCategoryBySlug(slug);
    res.json({ success: true, data });
  }),

  // ── Listings ──
  getListings: asyncHandler(async (req: Request, res: Response) => {
    const parsed = listingsQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid query');
    const data = await catalogService.getListings(parsed.data);
    res.json({ success: true, data });
  }),

  getListing: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await catalogService.getListingById(id);
    res.json({ success: true, data });
  }),

  createListing: asyncHandler(async (req: Request, res: Response) => {
    const parsed = createListingSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid listing data');
    const data = await catalogService.createListing(req.user!.sub, parsed.data);
    res.status(201).json({ success: true, data });
  }),

  updateListing: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = updateListingSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid update data');
    const data = await catalogService.updateListing(req.user!.sub, req.user!.role, id, parsed.data);
    res.json({ success: true, data });
  }),

  deleteListing: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await catalogService.deleteListing(req.user!.sub, req.user!.role, id);
    res.json({ success: true, ...result });
  }),

  submitForModeration: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await catalogService.submitForModeration(req.user!.sub, id);
    res.json({ success: true, data });
  }),

  getUploadAuthToken: asyncHandler(async (_req: Request, res: Response) => {
    const authParams = getUploadAuth();
    res.json({ success: true, data: authParams });
  }),

  aiSuggest: asyncHandler(async (req: Request, res: Response) => {
    const { rawText, categoryHint } = req.body;
    if (!rawText || typeof rawText !== 'string') throw new ValidationError('rawText is required');
    const result = await suggestListing(rawText, categoryHint);
    res.json({ success: true, data: result });
  }),
};
