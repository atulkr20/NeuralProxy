import { Request, Response, NextFunction } from 'express';
import redis from '../redis';

export async function rateLimitMiddleware(
    req: Request,
    res: Response, 
    next: NextFunction
)  {
    const apiKeyId = req.apiKey.id;
    const rateLimit = req.apiKey.rateLimit;

    const redisKey = `ratelimit:${apiKeyId}`;

    const now = Date.now();
    const windowStart = now - 60 * 1000;

    // Run all 4 redis commands together
    const pipeline = redis.multi();

    // Remove entries older than 60 seconds
    pipeline.zRemRangeByScore(redisKey, 0, windowStart);
    
    // count remaining entries
    pipeline.zCard(redisKey);
    
    // Add current request timestamp
    pipeline.zAdd(redisKey, { score: now, value: now.toString() });

    // Set TTL so redis auto-cleans this key
    pipeline.expire(redisKey, 60);

    const results = await pipeline.exec();
    const rawCount = results[1];
    const requestCount =
        typeof rawCount === 'number' ? rawCount : Number(rawCount ?? 0);

    if(requestCount >= rateLimit ) {
        res.status(429).json({
            error: 'rate limit exceeded. Try again in a minute.',
            limit: rateLimit,
            current: requestCount,
        });
        return;
    }

    next();
}