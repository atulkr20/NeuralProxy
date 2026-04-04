"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeRequest = routeRequest;
const openai_adapter_1 = require("../providers/openai.adapter");
const gemini_adapter_1 = require("../providers/gemini.adapter");
const mock_adapter_1 = require("../providers/mock.adapter");
const prisma_1 = __importDefault(require("../prisma"));
// Map the provider name to adapter instance
const adapterMap = {
    openai: new openai_adapter_1.OpenAIAdapter(),
    groq: new openai_adapter_1.OpenAIAdapter(),
    gemini: new gemini_adapter_1.GeminiAdapter(),
    mistral: new gemini_adapter_1.GeminiAdapter(),
    anthropic: new mock_adapter_1.MockAdapter(),
};
async function routeRequest(request, preferredProvider) {
    // Load provider configs from DB sorted by priority
    const providerConfigs = await prisma_1.default.providerConfig.findMany({
        where: { isEnabled: true },
        orderBy: { priority: 'asc' },
    });
    let adaptersToTry = [];
    if (preferredProvider && adapterMap[preferredProvider]) {
        adaptersToTry.push(adapterMap[preferredProvider]);
        for (const config of providerConfigs) {
            if (config.provider !== preferredProvider && adapterMap[config.provider]) {
                adaptersToTry.push(adapterMap[config.provider]);
            }
        }
    }
    else {
        for (const config of providerConfigs) {
            if (adapterMap[config.provider]) {
                adaptersToTry.push(adapterMap[config.provider]);
            }
        }
    }
    if (adaptersToTry.length === 0) {
        throw new Error('No enabled providers configured');
    }
    // Try each adapter one by one
    let lastError = null;
    let fallbackUsed = false;
    let isFirstAttempt = true;
    for (const adapter of adaptersToTry) {
        try {
            console.log(`Trying provider: ${adapter.name}`);
            const response = await adapter.call(request);
            if (!isFirstAttempt) {
                fallbackUsed = true;
            }
            return { ...response, fallbackUsed };
        }
        catch (error) {
            console.log(`Provider ${adapter.name} failed: ${error.message}`);
            lastError = error;
            isFirstAttempt = false;
            // only retry on server errors or rate limits
            const status = error.response?.status;
            if (status && status >= 400 && status < 500 && status !== 429) {
                throw error;
            }
        }
    }
    // All providers failed
    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
}
