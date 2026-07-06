export class ProviderRateLimitError extends Error {
  constructor(message, delayMs = 30000) {
    super(message);
    this.name = 'ProviderRateLimitError';
    this.delayMs = delayMs;
  }
}

export class ProviderPermanentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProviderPermanentError';
  }
}
