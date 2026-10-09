import { Router } from 'express';
import { catalogController } from './catalog.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';

const router = Router();

// Public routes
/**
 * @swagger
 * tags:
 *   name: Catalog
 *   description: Product catalog and listings management
 */

/**
 * @swagger
 * /catalog/categories:
 *   get:
 *     summary: Get all product categories
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories', catalogController.getCategories);

/**
 * @swagger
 * /catalog/categories/{slug}:
 *   get:
 *     summary: Get category by slug
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category details
 */
router.get('/categories/:slug', catalogController.getCategoryBySlug);

/**
 * @swagger
 * /catalog/listings:
 *   get:
 *     summary: Get product listings
 *     tags: [Catalog]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [AUCTION, FIXED_PRICE]
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/listings', optionalAuth, catalogController.getListings);

/**
 * @swagger
 * /catalog/listings/{id}:
 *   get:
 *     summary: Get listing by ID
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Listing details
 */
router.get('/listings/:id', optionalAuth, catalogController.getListing);

/**
 * @swagger
 * /catalog/upload-auth:
 *   get:
 *     summary: Get image upload authorization token
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upload token payload
 */
router.get('/upload-auth', authenticate, catalogController.getUploadAuthToken);

// Seller routes
/**
 * @swagger
 * /catalog/listings:
 *   post:
 *     summary: Create a new listing (Seller only)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, categoryId, type]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [AUCTION, FIXED_PRICE]
 *               priceInPaise:
 *                 type: number
 *     responses:
 *       201:
 *         description: Listing created successfully
 */
router.post('/listings', authenticate, catalogController.createListing);

/**
 * @swagger
 * /catalog/listings/{id}:
 *   patch:
 *     summary: Update an existing listing (Seller only)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Listing updated successfully
 */
router.patch('/listings/:id', authenticate, catalogController.updateListing);

/**
 * @swagger
 * /catalog/listings/{id}:
 *   delete:
 *     summary: Delete a listing (Seller only)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Listing deleted successfully
 */
router.delete('/listings/:id', authenticate, catalogController.deleteListing);

/**
 * @swagger
 * /catalog/listings/{id}/submit:
 *   post:
 *     summary: Submit a listing for moderation (Seller only)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Listing submitted successfully
 */
router.post('/listings/:id/submit', authenticate, catalogController.submitForModeration);

/**
 * @swagger
 * /catalog/listings/ai-suggest:
 *   post:
 *     summary: Generate AI suggestions for listing fields
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI suggestion
 */
router.post('/listings/ai-suggest', authenticate, catalogController.aiSuggest);

export default router;
