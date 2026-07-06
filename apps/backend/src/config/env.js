import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  CREDENTIAL_ENCRYPTION_KEY: z.string().length(32),
  PORT: z.string().default('3000'),
  CORS_ORIGIN: z.string().url(),
  LOG_LEVEL: z.string().default('info'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  
  LLM_PROVIDER: z.string().default('groq'),
  GROQ_API_KEY: z.string().optional(),
  REASONING_MODEL: z.string().default('llama-3.3-70b-versatile'),
  UTILITY_MODEL: z.string().default('llama-3.1-8b-instant'),
  
  EMBEDDING_PROVIDER: z.string().default('local'),
  EMBEDDING_MODEL: z.string().default('Xenova/bge-small-en-v1.5'),
  RETRIEVAL_CONFIDENCE_THRESHOLD: z.coerce.number().default(0.65),
  LLM_REQUEST_TIMEOUT_MS: z.coerce.number().default(45000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
