import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  API_PORT: Joi.number().default(4000),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  DATABASE_URL: Joi.string().required(),
  DIRECT_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_TTL_SECONDS: Joi.number().default(300),
  REDIS_KEY_PREFIX: Joi.string().default('ai-platform:'),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  BCRYPT_SALT_ROUNDS: Joi.number().default(12),
  GEMINI_API_KEY: Joi.string().allow('').default(''),
  GEMINI_MODEL: Joi.string().default('gemini-2.5-flash'),
  GEMINI_EMBEDDING_MODEL: Joi.string().default('text-embedding-004'),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
  MAX_UPLOAD_SIZE_MB: Joi.number().default(10),
  DEFAULT_PAGE_SIZE: Joi.number().default(20),
  MAX_PAGE_SIZE: Joi.number().default(100),
  ADMIN_EMAIL: Joi.string().email().default('admin@example.com'),
  ADMIN_PASSWORD: Joi.string().min(8).default('ChangeMe123!'),
  ADMIN_NAME: Joi.string().default('Platform Admin'),
  FIREBASE_SERVICE_ACCOUNT_PATH: Joi.string().allow('').default(''),
  FIREBASE_SERVICE_ACCOUNT_JSON: Joi.string().allow('').default(''),
});

export default () => ({
  nodeEnv: process.env.NODE_ENV,
  api: {
    port: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
    prefix: process.env.API_PREFIX ?? 'api/v1',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(
      ',',
    ),
  },
  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    ttlSeconds: Number(process.env.REDIS_TTL_SECONDS ?? 300),
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'ai-platform:',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },
  bcrypt: {
    saltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 12),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004',
  },
  throttle: {
    ttl: Number(process.env.THROTTLE_TTL ?? 60),
    limit: Number(process.env.THROTTLE_LIMIT ?? 100),
  },
  upload: {
    maxSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB ?? 10),
  },
  pagination: {
    defaultPageSize: Number(process.env.DEFAULT_PAGE_SIZE ?? 20),
    maxPageSize: Number(process.env.MAX_PAGE_SIZE ?? 100),
  },
  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@example.com',
    password: process.env.ADMIN_PASSWORD ?? 'ChangeMe123!',
    name: process.env.ADMIN_NAME ?? 'Platform Admin',
  },
  firebase: {
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? '',
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '',
  },
});
