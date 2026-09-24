import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import type { IncomingMessage } from 'node:http';
import type { Plugin } from 'vite';
import { analyzeWithQwen } from './server/qwenClient.ts';

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function qwenProxyPlugin(): Plugin {
  return {
    name: 'proofmate-qwen-proxy',
    configureServer(server) {
      server.middlewares.use('/api/qwen/analyze', async (request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.end(JSON.stringify({ state: 'method_not_allowed' }));
          return;
        }
        try {
          const body = await readJson(request) as { text?: unknown };
          if (typeof body.text !== 'string' || !body.text.trim()) {
            response.statusCode = 400;
            response.end(JSON.stringify({ state: 'invalid_request' }));
            return;
          }
          response.end(JSON.stringify(await analyzeWithQwen({ text: body.text })));
        } catch {
          response.statusCode = 400;
          response.end(JSON.stringify({ state: 'invalid_request' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), qwenProxyPlugin()],
  server: {
    host: '127.0.0.1',
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    globals: true,
  },
});
