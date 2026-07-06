export class EmbeddingProviderInterface {
  /**
   * Generates a vector embedding for the given text.
   * @param {string} text - The input text to embed.
   * @returns {Promise<number[]>} - The vector embedding.
   */
  async embed(text) {
    throw new Error('Method embed() must be implemented by concrete Embedding provider');
  }
}
