import { env } from '../../config/env.js';
import { XenovaProvider } from './providers/xenova.provider.js';

let providerInstance = null;

export function getEmbeddingProvider() {
  if (!providerInstance) {
    if (env.EMBEDDING_PROVIDER === 'local') {
      providerInstance = new XenovaProvider();
    } else {
      throw new Error(`Unsupported Embedding provider: ${env.EMBEDDING_PROVIDER}`);
    }
  }
  return providerInstance;
}
