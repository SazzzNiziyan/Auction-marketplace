import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { discoveryService } from './discovery.service';

export const discoveryController = {
  getHomeFeed: asyncHandler(async (_req: Request, res: Response) => {
    const data = await discoveryService.getHomeFeed();
    res.json({ success: true, data });
  }),

  search: asyncHandler(async (req: Request, res: Response) => {
    const { q, category, type, condition, minPrice, maxPrice, sort, page, limit } = req.query;
    const data = await discoveryService.search({
      q: q as string,
      categorySlug: category as string,
      type: type as any,
      condition: condition as string,
      minPrice: minPrice ? parseInt(minPrice as string, 10) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice as string, 10) : undefined,
      sort: sort as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });
    res.json({ success: true, data });
  }),
};
