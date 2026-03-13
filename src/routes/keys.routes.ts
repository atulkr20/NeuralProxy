import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../prisma'

const router = Router();


function hashApiKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
} 

// create a new API key
router.post('/', async (req: Request, res: Response) => {
    const { name, ownerId, rateLimit, monthlyBudget, allowedProviders } = req.body;

    if (!name || !ownerId) {
        res.status(400).json({ error: 'name and ownerId are required'});
        return;
    }

    // Generate a random API key with np_ prefix

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

    // Return the raw key once
    res.status(201).json({
        message: "API key created. save this key - it won't be shown again",
        apiKey: rawKey,
        id: apiKey.id,
        name: apiKey.name,
    });
});

// Get Key details

router.get('/:id', async (req: Request, res: Response) => {
    const apiKey = await prisma.apiKey.findUnique({
        where: { id: req.params.id as string},
    });

    if(!apiKey) {
        res.status(404).json({ error: "API key not found"});
        return;
    }

    // Never return the hash
    const { keyHash, ...safeData } = apiKey;
    res.json(safeData); 

});

router.post('/:id', async (req: Request, res: Response) => {
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

