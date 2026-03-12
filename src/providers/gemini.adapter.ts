import axios from "axios";
import https from "https";
import { ProviderAdapter, ChatRequest, ChatResponse } from "./adapter.interface";

const httpsAgent = new https.Agent({ family: 4 });

export class GeminiAdapter implements ProviderAdapter {
  name = "gemini";

  async call(request: ChatRequest): Promise<ChatResponse> {
    const response = await axios.post(
      "https://api.mistral.ai/v1/chat/completions",
      {
        model: "mistral-small-latest",
        messages: request.messages,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
        },
        httpsAgent,
      }
    );

    return {
      content: response.data.choices[0].message.content,
      inputTokens: response.data.usage.prompt_tokens,
      outputTokens: response.data.usage.completion_tokens,
      provider: "gemini",
    };
  }
}