import 'reflect-metadata';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../src/create-app';

let server: express.Express | undefined;
let initError: Error | undefined;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<unknown> {
  try {
    if (initError) {
      throw initError;
    }

    if (!server) {
      const expressApp = express();
      await createApp(new ExpressAdapter(expressApp));
      server = expressApp;
    }

    return server(req, res);
  } catch (error) {
    initError = error instanceof Error ? error : new Error(String(error));
    console.error('API bootstrap failed:', initError);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        statusCode: 500,
        message: initError.message,
      }),
    );
  }
}
