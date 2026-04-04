"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCost = calculateCost;
exports.isOverBudget = isOverBudget;
const prisma_1 = __importDefault(require("../prisma"));
async function calculateCost(provider, inputTokens, outputTokens) {
    // Load provider pricing from DB
    const config = await prisma_1.default.providerConfig.findUnique({
        where: { provider },
    });
    if (!config) {
        return 0;
    }
    const inputCost = (inputTokens / 1000) * Number(config.costPer1kInput);
    const outputCost = (outputTokens / 1000) * Number(config.costPer1kOutput);
    return inputCost + outputCost;
}
// Check if the api key has exceeded monthly budget 
async function isOverBudget(apiKeyId, monthlyBudget) {
    // Get start of current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    // Sum all costa for this key for this month
    const result = await prisma_1.default.requestLog.aggregate({
        where: {
            apiKeyId,
            createdAt: { gte: startOfMonth },
            status: 'success',
        },
        _sum: {
            costUsd: true,
        },
    });
    const totalSpent = Number(result._sum.costUsd || 0);
    console.log(`Key ${apiKeyId} spent $${totalSpent} of $${monthlyBudget} this month`);
    return totalSpent >= monthlyBudget;
}
