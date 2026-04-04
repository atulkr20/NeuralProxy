"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedResponse = getCachedResponse;
exports.setCachedResponse = setCachedResponse;
const crypto_1 = __importDefault(require("crypto"));
const redis_1 = __importDefault(require("../redis"));
// Generate a unique hash for this prompt
function generateCacheKey(model, messages) {
    const data = model + JSON.stringify(messages);
    return 'cache:' + crypto_1.default.createHash('sha256').update(data).digest('hex');
}
// Check if the cached response exists
async function getCachedResponse(model, messages) {
    const cacheKey = generateCacheKey(model, messages);
    const cached = await redis_1.default.get(cacheKey);
    if (!cached) {
        return null;
    }
    return JSON.parse(cached);
}
// Store the response in cache with TTL
async function setCachedResponse(model, messages, response) {
    const cacheKey = generateCacheKey(model, messages);
    const ttl = parseInt(process.env.CACHE_TTL_SECONDS || '3600');
    await redis_1.default.set(cacheKey, JSON.stringify(response), { EX: ttl });
}
