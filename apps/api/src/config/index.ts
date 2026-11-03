import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Resolve Monorepo Project Root
let projectRoot = process.cwd();
if (!fs.existsSync(path.resolve(projectRoot, 'storage')) && fs.existsSync(path.resolve(projectRoot, '../../storage'))) {
  projectRoot = path.resolve(projectRoot, '../..');
}

// Load .env
dotenv.config({ path: path.resolve(projectRoot, '.env') });
dotenv.config();

const storageBase = process.env.STORAGE_LOCAL_ROOT
  ? (path.isAbsolute(process.env.STORAGE_LOCAL_ROOT) ? process.env.STORAGE_LOCAL_ROOT : path.resolve(projectRoot, process.env.STORAGE_LOCAL_ROOT))
  : path.resolve(projectRoot, 'storage');

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
    localRoot: storageBase,
    rawDir: path.resolve(storageBase, 'originals'),
    originalsDir: path.resolve(storageBase, 'originals'),
    processedDir: path.resolve(storageBase, 'processed'),
    thumbnailsDir: path.resolve(storageBase, 'thumbnails'),
    tempDir: path.resolve(storageBase, 'temp'),
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
