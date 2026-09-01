import 'reflect-metadata';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../src/create-app';

let server: express.Express | undefined;
let initError: Error | undefined;
let initPromise: Promise<void> | undefined;

async function getServer(): Promise<express.Express> {
  if (initError) {
    throw initError;
  }

  if (server) {
    return server;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const expressApp = express();
      await createApp(new ExpressAdapter(expressApp));
      server = expressApp;
    })().catch((error: unknown) => {
      initError = error instanceof Error ? error : new Error(String(error));
      throw initError;
    });
  }

  await initPromise;
  return server!;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<unknown> {
  try {
    const app = await getServer();
    return app(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('API bootstrap failed:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ statusCode: 500, message }));
  }
}
