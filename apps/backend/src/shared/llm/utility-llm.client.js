import { getLLMProvider, getUtilityModel } from './roles.js';

/**
 * Utility LLM Client
 * Used for deterministic, structured tasks like metadata generation.
 */
export class UtilityLLMClient {
  constructor() {
    this.provider = getLLMProvider();
    this.model = getUtilityModel();
  }

  /**
   * Generates a structured response strictly forcing JSON output.
   * @param {string} systemPrompt 
   * @param {string} userPrompt 
   * @returns {Promise<any>} Parsed JSON object
   */
  async generateJson(systemPrompt, userPrompt, meta = {}) {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const response = await this.provider.complete({
      messages,
      model: this.model,
      temperature: 0, // Deterministic for utility tasks
      maxTokens: 4096,
      forceJson: true,
      meta
    });

    try {
      return JSON.parse(response.text);
    } catch (error) {
      console.error('Failed to parse utility LLM response as JSON:', response.text);
      throw new Error('LLM did not return valid JSON');
    }
  }
}
