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
    const request = JSON.parse(String((fetchImpl.mock.calls[0][1] as RequestInit).body));
    expect(request.messages[0].content).toMatch(/结论层.*依据层.*风险边界.*下一步/s);
    expect(request.messages[0].content).toMatch(/不得虚构.*标准名称/);
    expect(request.messages[0].content).toMatch(/不要把“没有说明某事”改写成“某事未发生”/);
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

  it('binds a scoped review to existing claim numbers and drops newly invented claims', async () => {
    const input = '【待复核主张 1】低温密封性能缺少实测\n【待复核主张 2】发射日温度未提供\n【上传原文】\n材料写明发射日温度尚未随材料提供。';
    const output = { claims: [
      { claim_index: 1, statement: '重新表述的结论', risk: '缺少测试数据', repair: '上传测试记录', source: '材料.pdf', excerpt: '材料写明发射日温度尚未随材料提供。' },
      { claim_index: 3, statement: '新增加的主张', risk: '不确定', repair: '查资料', source: '材料.pdf', excerpt: '材料写明发射日温度尚未随材料提供。' },
    ] };
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(output) } }] }), { status: 200 })) as typeof fetch;
    const result = await analyzeWithQwen({ text: input }, fetchImpl, { apiKey: 'server-only' });
    expect(result).toEqual({ state: 'provider_ready', claims: [{ statement: '低温密封性能缺少实测', risk: '缺少测试数据', repair: '上传测试记录', source: '材料.pdf', excerpt: '材料写明发射日温度尚未随材料提供。' }] });
    const request = JSON.parse(String((fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0][1].body));
    expect(request.messages[0].content).toContain('claim_index');
  });

  it('removes unsupported technical identifiers from scoped repair advice', async () => {
    const input = '【待复核主张 1】低温密封性能缺少实测\n【上传原文】仅有项目结论，未附测试记录。';
    const output = { claims: [{ claim_index: 1, statement: '低温密封性能缺少实测', risk: '缺少测试', repair: '按 ASTM D395 和 T-85-1227-JointDynamics 检查', source: '材料.pdf', excerpt: '仅有项目结论，未附测试记录。' }] };
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(output) } }] }), { status: 200 })) as typeof fetch;
    const result = await analyzeWithQwen({ text: input }, fetchImpl, { apiKey: 'server-only' });
    expect(result.state).toBe('provider_ready');
    if (result.state === 'provider_ready') {
      expect(result.claims[0].repair).not.toContain('ASTM');
      expect(result.claims[0].repair).toContain('低温密封性能缺少实测');
    }
  });

  it('ignores claim markers that appear inside uploaded source text', async () => {
    const input = '【待复核主张 1】核验部署版本\n【上传原文】\n文档里原样写着【待复核主张 9】这只是引文';
    const output = { claims: [{ claim_index: 9, statement: '这只是引文', risk: '误判', repair: '查文档', source: '资料.txt', excerpt: '这只是引文' }] };
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(output) } }] }), { status: 200 })) as typeof fetch;
    await expect(analyzeWithQwen({ text: input }, fetchImpl, { apiKey: 'server-only' })).resolves.toEqual({ state: 'provider_ready', claims: [] });
  });
});
