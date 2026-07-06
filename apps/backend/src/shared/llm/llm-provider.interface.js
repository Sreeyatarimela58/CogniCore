export class LLMProviderInterface {
  /**
   * Completes a chat prompt.
   * @param {Object} options
   * @param {Array<{role: string, content: string}>} options.messages - The conversation messages.
   * @param {string} options.model - The model to use.
   * @param {number} [options.temperature=0] - Temperature for sampling.
   * @param {number} [options.maxTokens=1024] - Maximum tokens to generate.
   * @param {boolean} [options.forceJson=false] - If true, enforces JSON response format.
   * @returns {Promise<{ text: string, raw: any }>}
   */
  async complete({ messages, model, temperature = 0, maxTokens = 1024, forceJson = false }) {
    throw new Error('Method complete() must be implemented by concrete LLM provider');
  }
}
