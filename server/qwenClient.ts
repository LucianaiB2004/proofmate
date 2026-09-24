export interface QwenInput { text: string }
export interface QwenClaim { statement: string; risk: string }
export type QwenResult =
  | { state: 'provider_not_configured' }
  | { state: 'provider_timeout' }
  | { state: 'provider_error'; message: string }
  | { state: 'provider_ready'; claims: QwenClaim[] };

interface QwenOptions { apiKey?: string; model?: string; timeoutMs?: number }

function parseClaims(content: string): QwenClaim[] {
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned) as { claims?: unknown };
  if (!Array.isArray(parsed.claims)) throw new Error('Qwen response has no claims array');
  return parsed.claims.filter((claim): claim is QwenClaim => {
    if (typeof claim !== 'object' || claim === null) return false;
    const item = claim as Record<string, unknown>;
    return typeof item.statement === 'string' && typeof item.risk === 'string';
  });
}

export async function analyzeWithQwen(
  input: QwenInput,
  fetchImpl: typeof fetch = fetch,
  options: QwenOptions = {},
): Promise<QwenResult> {
  const apiKey = options.apiKey ?? process.env.DASHSCOPE_API_KEY ?? '';
  if (!apiKey) return { state: 'provider_not_configured' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
  try {
    const response = await fetchImpl('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: options.model ?? process.env.QWEN_MODEL ?? 'qwen-plus',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: '你是真源 ProofMate 的证据审计器。只依据输入材料提取可验证主张和对应风险，以 {"claims":[{"statement":"...","risk":"..."}]} 返回。' },
          { role: 'user', content: input.text },
        ],
      }),
    });
    if (!response.ok) return { state: 'provider_error', message: `Qwen HTTP ${response.status}` };
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return { state: 'provider_error', message: 'Qwen 返回内容为空' };
    return { state: 'provider_ready', claims: parseClaims(content) };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return { state: 'provider_timeout' };
    return { state: 'provider_error', message: error instanceof Error ? error.message : '未知请求错误' };
  } finally {
    clearTimeout(timeout);
  }
}
