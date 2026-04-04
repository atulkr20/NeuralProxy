"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
const https_1 = __importDefault(require("https"));
// Force IPv4 to fix DNS resolution issues on Windows
const httpsAgent = new https_1.default.Agent({ family: 4 });
class OpenAIAdapter {
    constructor() {
        this.name = "openai";
    }
    async call(request) {
        const response = await axios_1.default.post("https://api.groq.com/openai/v1/chat/completions", {
            model: request.model || "llama-3.1-8b-instant",
            messages: request.messages,
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            },
            httpsAgent,
        });
        return {
            content: response.data.choices[0].message.content,
            inputTokens: response.data.usage.prompt_tokens,
            outputTokens: response.data.usage.completion_tokens,
            provider: "openai",
        };
    }
}
exports.OpenAIAdapter = OpenAIAdapter;
