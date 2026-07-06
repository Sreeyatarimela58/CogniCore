import { env } from '../../config/env.js';
import { GroqProvider } from './providers/groq.provider.js';

let providerInstance = null;

export function getLLMProvider() {
  if (!providerInstance) {
    if (env.LLM_PROVIDER === 'groq') {
      providerInstance = new GroqProvider();
    } else {
      throw new Error(`Unsupported LLM provider: ${env.LLM_PROVIDER}`);
    }
  }
  return providerInstance;
}

export function getReasoningModel() {
  return env.REASONING_MODEL;
}

export function getUtilityModel() {
  return env.UTILITY_MODEL;
}
