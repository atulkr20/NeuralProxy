import { Request, Response, NextFunction} from 'express';
import crypto from 'crypto';
import prisma from '../prisma';

// it hashes raw api key usig SHA-256

function hashApiKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export async function authMiddleware(
    req: Request, 
    res: Response,
    next: NextFunction
) {
    try {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            res.status(401).json({ error: 'No API key provided' });
            return;
        }

        if (!authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Invalid API key format' });
            return;
        }

        const rawKey = authHeader.slice('Bearer '.length).trim();

        if (!rawKey) {
            res.status(401).json({ error: 'Invalid API key format' });
            return;
        }

        const keyHash = hashApiKey(rawKey);

        const apiKey = await prisma.apiKey.findUnique({
            where: { keyHash },
        });

        // Check if key exists and is active.
        if (!apiKey || !apiKey.isActive) {
            res.status(401).json({ error: 'Invalid or inactive API key' });
            return;
        }

        req.apiKey = apiKey;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}