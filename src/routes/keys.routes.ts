import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../prisma'

const router = Router();

function hashApiKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
} 

/**
 * @swagger
 * /v1/keys:
 *   post:
 *     tags:
 *       - Keys
 *     summary: Create a new API key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - ownerId
 *             properties:
 *               name:
 *                 type: string
 *                 example: production-app
 *               ownerId:
 *                 type: string
 *                 example: user_1
 *               rateLimit:
 *                 type: integer
 *                 example: 60
 *               monthlyBudget:
 *                 type: number
 *                 example: 10.00
 *               allowedProviders:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["openai", "gemini"]
 *     responses:
 *       201:
 *         description: API key created successfully
 *       400:
 *         description: Missing required fields
 */
router.post('/', async (req: Request, res: Response) => {
    const { name, ownerId, rateLimit, monthlyBudget, allowedProviders } = req.body;

    if (!name || !ownerId) {
        res.status(400).json({ error: 'name and ownerId are required'});
        return;
    }

    const rawKey = 'np_' + crypto.randomBytes(32).toString('hex');
    const keyHash = hashApiKey(rawKey);

    const apiKey = await prisma.apiKey.create({
        data: {
            keyHash,
            name,
            ownerId,
            rateLimit: rateLimit || 60,
            monthlyBudget: monthlyBudget || 10.00,
            allowedProviders: allowedProviders || ['openai', 'gemini'],
        },
    });

    res.status(201).json({
        message: "API key created. save this key - it won't be shown again",
        apiKey: rawKey,
        id: apiKey.id,
        name: apiKey.name,
    });
});

/**
 * @swagger
 * /v1/keys/{id}:
 *   get:
 *     tags:
 *       - Keys
 *     summary: Get API key details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key details
 *       404:
 *         description: API key not found
 */
router.get('/:id', async (req: Request, res: Response) => {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
        res.status(400).json({ error: 'invalid api key id' });
        return;
    }

    const apiKey = await prisma.apiKey.findUnique({
        where: { id },
    });

    if(!apiKey) {
        res.status(404).json({ error: "API key not found"});
        return;
    }

    const { keyHash, ...safeData } = apiKey;
    res.json(safeData); 
});

/**
 * @swagger
 * /v1/keys/{id}:
 *   patch:
 *     tags:
 *       - Keys
 *     summary: Update API key settings
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rateLimit:
 *                 type: integer
 *                 example: 100
 *               monthlyBudget:
 *                 type: number
 *                 example: 20.00
 *               allowedProviders:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Updated successfully
 */
router.patch('/:id', async (req: Request, res: Response) => {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
        res.status(400).json({ error: 'invalid api key id' });
        return;
    }

    const { rateLimit, monthlyBudget, allowedProviders } = req.body;

    const apiKey = await prisma.apiKey.update({
        where: { id },
        data: {
            ...(rateLimit !== undefined && { rateLimit }),
            ...(monthlyBudget !== undefined && { monthlyBudget }),
            ...(allowedProviders !== undefined && { allowedProviders }),
        },
    });

    const { keyHash, ...safeData } = apiKey;
    res.json(safeData);
});

export default router;