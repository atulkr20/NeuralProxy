import axios from "axios";
import https from "https";
import { ProviderAdapter, ChatRequest, ChatResponse } from "./adapter.interface";

// Force IPv4 to fix DNS resolution issues on Windows
const httpsAgent = new https.Agent({ family: 4 });

export class OpenAIAdapter implements ProviderAdapter {
  name = "openai";

  async call(request: ChatRequest): Promise<ChatResponse> {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: request.model || "llama-3.1-8b-instant",
        messages: request.messages,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        httpsAgent,
      }
    );

    return {
      content: response.data.choices[0].message.content,
      inputTokens: response.data.usage.prompt_tokens,
      outputTokens: response.data.usage.completion_tokens,
      provider: "openai",
    };
  }
}