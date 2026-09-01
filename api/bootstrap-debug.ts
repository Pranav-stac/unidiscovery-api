import 'reflect-metadata';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createApp } = require('../dist/src/create-app') as {
      createApp: (
        adapter: ExpressAdapter,
      ) => Promise<import('@nestjs/common').INestApplication>;
    };
    const expressApp = express();
    await createApp(new ExpressAdapter(expressApp));
    res.status(200).json({ ok: true, message: 'Nest bootstrap succeeded' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('Bootstrap debug failed:', error);
    res.status(500).json({ ok: false, message, stack });
  }
}
