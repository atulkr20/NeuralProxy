"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
const https_1 = __importDefault(require("https"));
const httpsAgent = new https_1.default.Agent({ family: 4 });
class GeminiAdapter {
    constructor() {
        this.name = "gemini";
    }
    async call(request) {
        const response = await axios_1.default.post("https://api.mistral.ai/v1/chat/completions", {
            model: "mistral-small-latest",
            messages: request.messages,
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
            },
            httpsAgent,
        });
        return {
            content: response.data.choices[0].message.content,
            inputTokens: response.data.usage.prompt_tokens,
            outputTokens: response.data.usage.completion_tokens,
            provider: "gemini",
        };
    }
}
exports.GeminiAdapter = GeminiAdapter;
