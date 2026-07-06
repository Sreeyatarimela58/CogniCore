import { pipeline } from '@xenova/transformers';
import { EmbeddingProviderInterface } from '../embedding-provider.interface.js';
import { env } from '../../../config/env.js';

export class XenovaProvider extends EmbeddingProviderInterface {
  constructor() {
    super();
    this.modelName = env.EMBEDDING_MODEL || 'BAAI/bge-small-en-v1.5';
    this.extractorPromise = pipeline('feature-extraction', this.modelName);
  }

  async embed(text) {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot embed empty text');
    }
    
    try {
      const extractor = await this.extractorPromise;
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      // Output is a Tensor, we want a regular array of numbers
      return Array.from(output.data);
    } catch (error) {
      console.error('Xenova Embedding failed:', error);
      throw error;
    }
  }
}
