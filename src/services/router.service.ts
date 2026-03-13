import { ProviderAdapter, ChatRequest, ChatResponse } from "../providers/adapter.interface";
import { GroqAdapter } from "../providers/openai.adapter";
import { GeminiAdapter } from "../providers/gemini.adapter";
import { MockAdapter } from "../providers/mock.adapter";
import prisma from '../prisma';

// Map the provider name to adapter instance
const adapterMap: Record<string, ProviderAdapter> = {
    openai: new GroqAdapter(),
    gemini: new GeminiAdapter(),
    anthropic: new MockAdapter(),
};

export async function routeRequest(
    request: ChatRequest,
    preferredProvider?: string
): Promise<ChatResponse & { fallbackUsed: boolean }> {

    // Load provider configs from DB sorted by priority

    const providerConfigs = await prisma.providerConfig.findMany({
        where: { isEnabled: true },
        orderBy: { priority: 'asc' },
    });

    let adaptersToTry: ProviderAdapter[] = [];

    if(preferredProvider && adapterMap[preferredProvider]) {
        adaptersToTry.push(adapterMap[preferredProvider]);

        for(const config of providerConfigs) {
            if (config.provider !== preferredProvider && adapterMap[config.provider]) {
                adaptersToTry.push(adapterMap[config.provider]);
            }
        }
    } else {
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

    let lastError: Error | null = null;
    let fallbackUsed = false;
    let isFirstAttempt = true;

    for (const adapter of adaptersToTry) {
        try {
            console.log(`Trying provider: ${adapter.name}`);

            const response = await adapter.call(request);

            if(!isFirstAttempt) {
                fallbackUsed = true;
            }

            return { ...response, fallbackUsed };
        } catch (error: any) {
            console.log(`Provider ${adapter.name} failed: ${error.message}`);
            lastError = error;
            isFirstAttempt = false;

            // only retry on server errors or rate limits

            const status = error.response?.status;
            if(status && status >= 400 && status < 500 && status !== 429) {
                throw error;
            }

        }
    }
    // All providers failed
    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
}