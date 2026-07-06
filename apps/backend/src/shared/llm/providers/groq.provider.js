import { LLMProviderInterface } from '../llm-provider.interface.js';
import { ProviderRateLimitError, ProviderPermanentError } from '../llm-errors.js';
import { env } from '../../../config/env.js';

export class GroqProvider extends LLMProviderInterface {
  constructor() {
    super();
    if (!env.GROQ_API_KEY) {
      console.warn('GROQ_API_KEY is not set. LLM calls will fail if triggered.');
    }
  }

  async complete({ messages, model, temperature = 0, maxTokens = 1024, forceJson = false, meta = {} }) {
    if (!env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is missing');
    }

    const body = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    if (forceJson) {
      body.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), env.LLM_REQUEST_TIMEOUT_MS);

    let response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        const rateLimitErr = new ProviderRateLimitError(`Groq API Request Timed Out`, 10000); // Wait 10s before retrying
        rateLimitErr.httpStatus = 408;
        throw rateLimitErr;
      }
      error.httpStatus = 500;
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 429) {
        // Attempt to parse "try again in Xs" or use Retry-After header
        let delayMs = 30000; // Default 30s
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          delayMs = parseFloat(retryAfter) * 1000;
        } else {
          const match = errorText.match(/try again in ([\d\.]+)s/i);
          if (match && match[1]) {
            delayMs = parseFloat(match[1]) * 1000;
          }
        }
        // Add a small buffer of 2 seconds just to be safe
        const rateLimitErr = new ProviderRateLimitError(`Groq Rate Limit Exceeded`, delayMs + 2000);
        rateLimitErr.httpStatus = 429;
        throw rateLimitErr;
      }
      
      if ([400, 401, 403].includes(response.status)) {
        const permErr = new ProviderPermanentError(`Groq API Error (${response.status}): ${errorText}`);
        permErr.httpStatus = response.status;
        throw permErr;
      }

      const genericErr = new Error(`Groq API Error (${response.status}): ${errorText}`);
      genericErr.httpStatus = response.status;
      throw genericErr;
    }

    const data = await response.json();
    return {
      text: data.choices[0]?.message?.content || '',
      raw: data,
      meta: {
        httpStatus: response.status
      }
    };
  }
}
