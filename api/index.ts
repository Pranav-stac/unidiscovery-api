import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../src/create-app';

let server: express.Express | undefined;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<unknown> {
  if (!server) {
    const expressApp = express();
    await createApp(new ExpressAdapter(expressApp));
    server = expressApp;
  }

  return server(req, res);
}
