import { resolve } from "node:dns";
import { ProviderAdapter, ChatRequest, ChatResponse } from "./adapter.interface";

// This is for testing only for now 
export class MockAdapter implements ProviderAdapter {
    name = 'anthropic';

    async call(request: ChatRequest): Promise<ChatResponse> {
        await new Promise((resolve) => setTimeout(resolve, 200));

        return {
            content: `Mock response to: '${request.messages[request.messages.length -1].content}`,
            inputTokens: 10, 
            outputTokens: 20,
            provider: 'anthropic',


        };
    }
}