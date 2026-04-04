"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All analytics routes require auth
router.use(auth_middleware_1.authMiddleware);
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
router.get('/usage', async (req, res) => {
    const apiKeyId = req.apiKey.id;
    const result = await prisma_1.default.requestLog.aggregate({
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
        totalOutputTokens: result._sum.outputTokens || 0,
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
router.get('/costs', async (req, res) => {
    const apiKeyId = req.apiKey.id;
    const result = await prisma_1.default.requestLog.groupBy({
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
router.get("/cache", async (req, res) => {
    const apiKeyId = req.apiKey.id;
    const totalRequests = await prisma_1.default.requestLog.count({
        where: { apiKeyId },
    });
    const cacheHits = await prisma_1.default.requestLog.count({
        where: { apiKeyId, cacheHit: true },
    });
    const cacheMisses = totalRequests - cacheHits;
    const hitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
    // Estimate tokens saved from cache hits
    const cacheSavings = await prisma_1.default.requestLog.aggregate({
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
        estimatedTokensSaved: (cacheSavings._sum.inputTokens || 0) + (cacheSavings._sum.outputTokens || 0),
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
router.get('/providers', async (req, res) => {
    const apiKeyId = req.apiKey.id;
    const result = await prisma_1.default.requestLog.groupBy({
        by: ['provider', 'status'],
        where: { apiKeyId },
        _count: { id: true },
        _avg: { latencyMs: true },
    });
    // Group by provider
    const providerMap = {};
    for (const item of result) {
        if (!providerMap[item.provider]) {
            providerMap[item.provider] = {
                provider: item.provider,
                totalRequests: 0,
                successCount: 0,
                failedCount: 0,
                avgLatencyMs: item._avg.latencyMs || 0,
            };
        }
        providerMap[item.provider].totalRequests += item._count.id;
        if (item.status === 'success') {
            providerMap[item.provider].successCount += item._count.id;
        }
        else {
            providerMap[item.provider].failedCount += item._count.id;
        }
    }
    // calculate error rate per provider
    const providers = Object.values(providerMap).map((p) => ({
        ...p,
        errorRatePercent: p.totalRequests > 0
            ? ((p.failedCount / p.totalRequests) * 100).toFixed(2)
            : '0.000',
    }));
    res.json(providers);
});
exports.default = router;
