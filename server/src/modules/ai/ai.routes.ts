import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { supportChatbot, suggestListing, moderateListing } from '../../integrations/gemini';
import { ValidationError } from '../../utils/errors';
import { optionalAuth } from '../../middleware/auth';

const router = Router();

// 24/7 Customer Support Chatbot
router.post(
  '/support-chat',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      throw new ValidationError('Message is required');
    }
    const reply = await supportChatbot(message, Array.isArray(history) ? history : []);
    res.json({ success: true, data: { reply } });
  })
);

// Listing Assistant
router.post(
  '/listing-assistant',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { rawText, categoryHint } = req.body;
    if (!rawText || typeof rawText !== 'string') {
      throw new ValidationError('rawText is required');
    }
    const suggestion = await suggestListing(rawText, categoryHint);
    res.json({ success: true, data: suggestion });
  })
);

// Moderation scan
router.post(
  '/moderate',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { title, description } = req.body;
    if (!title || !description) throw new ValidationError('Title and description required');
    const result = await moderateListing(title, description);
    res.json({ success: true, data: result });
  })
);

export default router;
