import type { Response } from 'express';

export async function pipeTextStreamToSse(
  res: Response,
  stream: AsyncGenerator<string>,
  finalize?: (content: string) => Promise<Record<string, unknown> | void>,
) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let content = '';
  try {
    for await (const chunk of stream) {
      content += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    const payload = finalize ? await finalize(content) : {};
    res.write(`data: ${JSON.stringify({ done: true, ...payload })}\n\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stream failed';
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
  } finally {
    res.end();
  }
}
