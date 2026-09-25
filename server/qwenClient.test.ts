import { analyzeWithQwen } from './qwenClient';

describe('Qwen server adapter', () => {
  it('reports an unconfigured provider without making a request', async () => {
    const fetchImpl = vi.fn();
    await expect(analyzeWithQwen({ text: 'evidence' }, fetchImpl, { apiKey: '' })).resolves.toEqual({ state: 'provider_not_configured' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('turns an abort into a provider timeout', async () => {
    const fetchImpl = vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })) as unknown as typeof fetch;
    await expect(analyzeWithQwen({ text: 'evidence' }, fetchImpl, { apiKey: 'server-only', timeoutMs: 5 })).resolves.toEqual({ state: 'provider_timeout' });
  });

  it('validates and returns Qwen structured output', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"claims":[{"statement":"节能 31%","risk":"样本周期短","repair":"补充30天对照实验","source":"研究报告.pdf · P12","excerpt":"7天节能31%"}]}' } }] }), { status: 200 })) as typeof fetch;
    const result = await analyzeWithQwen({ text: 'report' }, fetchImpl, { apiKey: 'server-only' });
    expect(result).toEqual({ state: 'provider_ready', claims: [{ statement: '节能 31%', risk: '样本周期短', repair: '补充30天对照实验', source: '研究报告.pdf · P12', excerpt: '7天节能31%' }] });
    expect(JSON.stringify(result)).not.toContain('server-only');
    expect((fetchImpl.mock.calls[0][1] as RequestInit).body).toContain('json');
  });

  it('drops incomplete findings instead of inventing traceability fields', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"claims":[{"statement":"节能 31%","risk":"样本周期短"}]}' } }] }), { status: 200 })) as typeof fetch;
    await expect(analyzeWithQwen({ text: 'report' }, fetchImpl, { apiKey: 'server-only' })).resolves.toEqual({ state: 'provider_ready', claims: [] });
  });

  it('preserves the provider error code without exposing credentials', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'invalid_parameter', message: 'bad request' } }), { status: 400 })) as typeof fetch;
    await expect(analyzeWithQwen({ text: 'report' }, fetchImpl, { apiKey: 'server-only' })).resolves.toEqual({
      state: 'provider_error', message: 'Qwen HTTP 400: invalid_parameter · bad request',
    });
  });
});
