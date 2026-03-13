import crypto from 'crypto';
import redis from '../redis';

// Generate a unique hash for this prompt
function generateCacheKey(model: string, messages: { role: string; content: string } []): string {
    const data = model + JSON.stringify(messages);
    return 'cache:' + crypto.createHash('sha256').update(data).digest('hex');
}

// Check if the cached response exists

export async function getCachedResponse(
    model: string, 
    messages: { role: string; content: string } []
): Promise<{ content: string; inputTokens: number; outputTokens: number } | null> {
    const cacheKey = generateCacheKey(model, messages);

    const cached = await redis.get(cacheKey);

    if(!cached) {
        return null;
    }

    return JSON.parse(cached);
}

// Store the response in cache with TTL
export async function setCachedResponse(
    model: string, 
    messages: { role: string; content: string } [],
    response: { content: string; inputTokens: number; outputTokens: number}
): Promise<void> {
    const cacheKey = generateCacheKey(model, messages);
    const ttl = parseInt(process.env.CACHE_TTL_SECONDS || '3600');

    await redis.set(cacheKey, JSON.stringify(response), { EX: ttl});
}