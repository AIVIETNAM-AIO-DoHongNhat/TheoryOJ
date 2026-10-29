import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { env } from "./env";

// Ollama, OpenRouter hay vLLM đều có API tương thích OpenAI, đổi mô hình bằng biến môi trường.
const provider = createOpenAICompatible({
  name: "llm",
  baseURL: env.LLM_BASE_URL,
  apiKey: env.LLM_API_KEY,
});

export const chatModel = provider.chatModel(env.LLM_MODEL);
export const fastModel = provider.chatModel(env.LLM_FAST_MODEL ?? env.LLM_MODEL);
