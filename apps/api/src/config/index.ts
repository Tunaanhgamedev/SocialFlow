import path from 'path';
import dotenv from 'dotenv';

// Load .env from root if not already loaded
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:5173',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/socialflow?schema=public',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  storage: {
    localRoot: path.resolve(process.cwd(), process.env.STORAGE_LOCAL_ROOT || './storage'),
    rawDir: path.resolve(process.cwd(), process.env.STORAGE_LOCAL_ROOT || './storage', 'raw'),
    processedDir: path.resolve(process.cwd(), process.env.STORAGE_LOCAL_ROOT || './storage', 'processed'),
    thumbnailsDir: path.resolve(process.cwd(), process.env.STORAGE_LOCAL_ROOT || './storage', 'thumbnails'),
  },

  ai: {
    activeProvider: process.env.AI_ACTIVE_PROVIDER || 'mock',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
  },

  meta: {
    appId: process.env.META_APP_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
    redirectUri: process.env.META_REDIRECT_URI || 'http://localhost:3000/api/v1/accounts/connect/meta/callback',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-dev-jwt-secret-key-32charsmin',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  }
};
