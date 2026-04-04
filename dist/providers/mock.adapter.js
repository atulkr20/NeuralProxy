"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAdapter = void 0;
// This is for testing only for now 
class MockAdapter {
    constructor() {
        this.name = 'anthropic';
    }
    async call(request) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return {
            content: `Mock response to: '${request.messages[request.messages.length - 1].content}`,
            inputTokens: 10,
            outputTokens: 20,
            provider: 'anthropic',
        };
    }
}
exports.MockAdapter = MockAdapter;
