import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All analytics routes require auth
router.use(authMiddleware);

/**
 * @swagger
 * /v1/analytics/usage:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get total usage stats for your API key
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Total requests, tokens, and cost
 */

// Usage - total requests, tokens, cost
router.get('/usage', async (req: Request, res: Response) => {
    const apiKeyId = req.apiKey.id;

    const result = await prisma.requestLog.aggregate({
        where: { apiKeyId },
        _count: { id: true },
        _sum: {
            inputTokens: true,
            outputTokens: true,
            costUsd: true,
        },
    });

    res.json({
        totalRequests: result._count.id,
        totalInputTokens: result._sum.inputTokens || 0,
        totalOutputTokens: result._sum.outputTokens ||0,
        totalCostUsd: result._sum.costUsd || 0,
    });
});

/**
 * @swagger
 * /v1/analytics/costs:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get cost breakdown by provider and model
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cost breakdown per provider and model
 */

// Costs - breakdown by provider and model
router.get('/costs', async(req: Request, res: Response) => {
    const apiKeyId = req.apiKey.id;

    const result = await prisma.requestLog.groupBy({
        by: ['provider', 'model'],
        where: { apiKeyId },
        _sum: {
            costUsd: true,
            inputTokens: true,
            outputTokens: true,
        },
        _count: { id: true },
    });

    res.json(result.map((item) => ({
        provider: item.provider,
        model: item.model,
        requests: item._count.id,
        totalCostUsd: item._sum.costUsd || 0,
        totalInputTokens: item._sum.inputTokens || 0,
        totalOutputTokens: item._sum.outputTokens || 0,
    })));
});


/**
 * @swagger
 * /v1/analytics/cache:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get cache hit rate and savings
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cache hit rate, tokens saved, money saved
 */


// cache - cache hit rate and savings

router.get("/cache", async (req: Request, res: Response) => {
    const apiKeyId = req.apiKey.id;

    const totalRequests = await prisma.requestLog.count({
        where: { apiKeyId },
    });
    
    const cacheHits = await prisma.requestLog.count({
        where: { apiKeyId, cacheHit: true },
    });

    const cacheMisses = totalRequests - cacheHits;
    const hitRate = totalRequests > 0 ? (cacheHits / totalRequests ) * 100 : 0;

    // Estimate tokens saved from cache hits
    const cacheSavings = await prisma.requestLog.aggregate({
        where: { apiKeyId, cacheHit: true },
        _sum: {
            inputTokens: true, 
            outputTokens: true, 
            costUsd: true,
        },
    });

    res.json({
        totalRequests,
        cacheHits,
        cacheMisses,
        hitRatePercent: hitRate.toFixed(2),
        estimatedTokensSaved: (cacheSavings._sum.inputTokens || 0) + (cacheSavings._sum.outputTokens ||  0),
        estimateMoneySaved: cacheSavings._sum.costUsd || 0,
    });
});

/**
 * @swagger
 * /v1/analytics/providers:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get provider health and latency stats
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Provider health, avg latency, error rates
 */



// Providers - provider health and latency
router.get('/providers', async (req: Request, res: Response) => {
    const apiKeyId = req.apiKey.id;

    const result = await prisma.requestLog.groupBy({
        by: ['provider', 'status'],
        where: { apiKeyId },
        _count: { id: true },
        _avg: { latencyMs: true },
    });

    // Group by provider
    const providerMap: Record<string, any> = {};

    for (const item of result) {
        if (!providerMap[item.provider]) {
            providerMap[item.provider] = {
                provider: item.provider,
                totalrequests: 0,
                successCount: 0,
                failedCount: 0,
                avgLatencyMs: item._avg.latencyMs || 0,
            };
        }

        providerMap[item.provider].totalRequests += item._count.id;

        if(item.status === 'success') {
            providerMap[item.provider].successCount += item._count.id;
        } else {
            providerMap[item.provider].failedCount += item._count.id;
        }
    }

    // calculate error rate per provider

    const providers = Object.values(providerMap).map((p: any) => ({
        ...p,
        errorRatePercent: p.totalRequests > 0
        ? ((p.failedCount / p.totalrequests) * 100).toFixed(2)
        : '0.000',
    }));
    
    res.json(providers);
});

export default router;