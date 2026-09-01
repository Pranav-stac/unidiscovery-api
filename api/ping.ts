import type { VercelRequest, VercelResponse } from '@vercel/node';
import { existsSync } from 'fs';
import { resolve } from 'path';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const distMain = resolve(process.cwd(), 'dist/src/create-app.js');
  res.status(200).json({
    ok: true,
    cwd: process.cwd(),
    distExists: existsSync(distMain),
    nodeEnv: process.env.NODE_ENV,
  });
}
