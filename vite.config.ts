import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage } from 'node:http';
import type { Plugin } from 'vite';
import { analyzeWithQwen } from './server/qwenClient.ts';
import { providerStatus, readProviderSecrets, saveProviderSecrets } from './server/providerSettings.ts';
import { parseImageWithXParse } from './server/xparseClient.ts';

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function proofmateProxyPlugin(defaults: { dashscopeApiKey?: string; textinAppId?: string; textinSecretCode?: string }, model: string): Plugin {
  const effectiveSecrets = async () => {
    const local = await readProviderSecrets();
    return {
      dashscopeApiKey: local.dashscopeApiKey || defaults.dashscopeApiKey,
      textinAppId: local.textinAppId || defaults.textinAppId,
      textinSecretCode: local.textinSecretCode || defaults.textinSecretCode,
    };
  };
  return {
    name: 'proofmate-provider-proxy',
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
          const secrets = await effectiveSecrets();
          response.end(JSON.stringify(await analyzeWithQwen({ text: body.text }, fetch, { apiKey: secrets.dashscopeApiKey, model })));
        } catch {
          response.statusCode = 400;
          response.end(JSON.stringify({ state: 'invalid_request' }));
        }
      });
      server.middlewares.use('/api/settings', async (request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        try {
          if (request.method === 'GET') response.end(JSON.stringify(providerStatus(await effectiveSecrets())));
          else if (request.method === 'POST') { await saveProviderSecrets(await readJson(request) as Record<string, string>); response.end(JSON.stringify(providerStatus(await effectiveSecrets()))); }
          else { response.statusCode = 405; response.end(JSON.stringify({ state: 'method_not_allowed' })); }
        } catch { response.statusCode = 500; response.end(JSON.stringify({ state: 'settings_failed' })); }
      });
      server.middlewares.use('/api/xparse/parse', async (request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (request.method !== 'POST') { response.statusCode = 405; response.end(JSON.stringify({ state: 'method_not_allowed' })); return; }
        try {
          const body = await readJson(request) as { name?: unknown; data?: unknown };
          if (typeof body.name !== 'string' || typeof body.data !== 'string' || body.data.length > 15_000_000) throw new Error('invalid_request');
          const text = await parseImageWithXParse(body.name, body.data, await effectiveSecrets());
          response.end(JSON.stringify({ state: 'parsed', parser: 'textin-xparse', text }));
        } catch (error) {
          response.statusCode = 422;
          response.end(JSON.stringify({ state: 'parse_failed', message: error instanceof Error ? error.message : 'xParse OCR 解析失败' }));
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
  plugins: [react(), proofmateProxyPlugin({ dashscopeApiKey: env.DASHSCOPE_API_KEY, textinAppId: env.XPARSE_APP_ID, textinSecretCode: env.XPARSE_SECRET_CODE }, env.QWEN_MODEL ?? 'qwen-plus')],
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
