import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage } from 'node:http';
import type { Plugin } from 'vite';
import { analyzeWithQwen } from './server/qwenClient.ts';

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function qwenProxyPlugin(apiKey: string, model: string): Plugin {
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
          response.end(JSON.stringify(await analyzeWithQwen({ text: body.text }, fetch, { apiKey, model })));
        } catch {
          response.statusCode = 400;
          response.end(JSON.stringify({ state: 'invalid_request' }));
        }
      });
      server.middlewares.use('/api/local/status', async (_request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        try {
          const upstream = await fetch('http://127.0.0.1:8787/health', { signal: AbortSignal.timeout(1500) });
          response.end(await upstream.text());
        } catch { response.end(JSON.stringify({ state: 'service_unavailable' })); }
      });
      server.middlewares.use('/api/local/analyze', async (request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        try {
          const body = await readJson(request);
          const upstream = await fetch('http://127.0.0.1:8787/v1/local/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
          response.statusCode = upstream.status;
          response.end(await upstream.text());
        } catch { response.statusCode = 503; response.end(JSON.stringify({ state: 'service_unavailable' })); }
      });
      server.middlewares.use('/api/local/evidence', async (request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        try {
          const body = await readJson(request);
          const upstream = await fetch('http://127.0.0.1:8787/v1/local/evidence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
          response.statusCode = upstream.status;
          response.end(await upstream.text());
        } catch { response.statusCode = 503; response.end(JSON.stringify({ state: 'service_unavailable' })); }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return ({
  plugins: [react(), qwenProxyPlugin(env.DASHSCOPE_API_KEY ?? '', env.QWEN_MODEL ?? 'qwen-plus')],
  server: {
    host: '127.0.0.1',
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    globals: true,
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
  },
  });
});
