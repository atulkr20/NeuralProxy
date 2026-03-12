export interface ChatRequest {
    model: string;
    messages: { role: string; content: string }[];
}

export interface ChatResponse {
    content: string;
    inputTokens: number;
    outputTokens: number;
    provider: string;
}

export interface ProviderAdapter {
    name: string;
    call(request: ChatRequest): Promise<ChatResponse>;
}