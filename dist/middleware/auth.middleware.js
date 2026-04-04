"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("../prisma"));
// it hashes raw api key usig SHA-256
function hashApiKey(rawKey) {
    return crypto_1.default.createHash('sha256').update(rawKey).digest('hex');
}
async function authMiddleware(req, res, next) {
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
        const apiKey = await prisma_1.default.apiKey.findUnique({
            where: { keyHash },
        });
        // Check if key exists and is active.
        if (!apiKey || !apiKey.isActive) {
            res.status(401).json({ error: 'Invalid or inactive API key' });
            return;
        }
        req.apiKey = apiKey;
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
