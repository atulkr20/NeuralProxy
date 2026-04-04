"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const budget_middleware_1 = require("../middleware/budget.middleware");
const cache_service_1 = require("../services/cache.service");
const router_service_1 = require("../services/router.service");
const cost_service_1 = require("../services/cost.service");
const logQueue_1 = require("../queues/logQueue");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /v1/chat:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Send a message to an LLM provider
 *     description: Routes the request to the best available LLM provider with automatic fallback, rate limiting, budget enforcement, and prompt caching.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - model
 *               - messages
 *             properties:
 *               model:
 *                 type: string
 *                 example: llama-3.1-8b-instant
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       example: user
 *                     content:
 *                       type: string
 *                       example: What is the capital of France?
 *               provider:
 *                 type: string
 *                 example: openai
 *                 description: Optional — uses priority order if not specified
 *     responses:
 *       200:
 *         description: Successful response from LLM
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: string
 *                 provider_used:
 *                   type: string
 *                 cache_hit:
 *                   type: boolean
 *                 tokens:
 *                   type: object
 *                   properties:
 *                     input:
 *                       type: integer
 *                     output:
 *                       type: integer
 *                 cost_usd:
 *                   type: number
 *                 fallback_used:
 *                   type: boolean
 *       401:
 *         description: Invalid or missing API key
 *       429:
 *         description: Rate limit exceeded
 *       402:
 *         description: Monthly budget exceeded
 *       500:
 *         description: All providers failed
 */
// Chat
router.post('/', auth_middleware_1.authMiddleware, rateLimit_middleware_1.rateLimitMiddleware, budget_middleware_1.budgetMiddleware, async (req, res) => {
    const { model, messages, provider } = req.body;
    if (!model || !messages) {
        res.status(400).json({ error: 'model and messages are required' });
        return;
    }
    const startTime = Date.now();
    // generate prompt hash for cache key and logging
    const promptHash = crypto_1.default
        .createHash('sha256')
        .update(model + JSON.stringify(messages))
        .digest('hex');
    // Check cache first
    const cached = await (0, cache_service_1.getCachedResponse)(model, messages);
    if (cached) {
        // if cache hit, return immediately, no LLM call neede
        await logQueue_1.logQueue.add('log-request', {
            apiKeyId: req.apiKey.id,
            provider: 'cache',
            model,
            promptHash,
            inputTokens: cached.inputTokens,
            outputTokens: cached.outputTokens,
            costUsd: 0,
            latencyMs: Date.now() - startTime,
            cacheHit: true,
            fallbackUsed: false,
            status: 'success',
        });
        res.json({
            content: cached.content,
            provider_used: 'cache',
            tokens: {
                input: cached.inputTokens,
                output: cached.outputTokens,
            },
            cost_usd: 0,
        });
        return;
    }
    // if cache miss, call the LLM via router
    try {
        const response = await (0, router_service_1.routeRequest)({ model, messages }, provider);
        const latencyMs = Date.now() - startTime;
        // calculate cost
        const costUsd = await (0, cost_service_1.calculateCost)(response.provider, response.inputTokens, response.outputTokens);
        // Store inn cache for next time
        await (0, cache_service_1.setCachedResponse)(model, messages, response);
        // Enqueue log job async
        await logQueue_1.logQueue.add('log-request', {
            apiKeyId: req.apiKey.id,
            provider: response.provider,
            model,
            promptHash,
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens,
            costUsd,
            latencyMs,
            cacheHit: false,
            fallbackUsed: response.fallbackUsed,
            status: 'success',
        });
        // Return unified response
        res.json({
            content: response.content,
            provider_used: response.provider,
            cache_hit: false,
            tokens: {
                input: response.inputTokens,
                output: response.outputTokens,
            },
            cost_usd: costUsd,
            fallback_used: response.fallbackUsed,
        });
    }
    catch (error) {
        // If all providers failed - log it and return 500
        await logQueue_1.logQueue.add('log-request', {
            apiKeyId: req.apiKey.id,
            provider: 'unknown',
            model,
            promptHash,
            inputTokens: 0,
            outputTokens: 0,
            costUsd: 0,
            latencyMs: Date.now() - startTime,
            cacheHit: false,
            fallbackUsed: true,
            status: 'failed',
        });
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
