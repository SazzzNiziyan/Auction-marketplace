import { Router } from 'express';
import { discoveryController } from './discovery.controller';

const router = Router();

router.get('/home', discoveryController.getHomeFeed);
router.get('/search', discoveryController.search);

export default router;
