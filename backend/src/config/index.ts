export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://caresync:caresync_dev@localhost:5432/caresync',
  aiEngineUrl: process.env.AI_ENGINE_URL ?? 'http://localhost:8000',
  simulatorUrl: process.env.SIMULATOR_URL ?? 'http://localhost:8001',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
} as const;
