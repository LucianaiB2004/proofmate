export interface QwenInput { text: string }
export interface QwenClaim {
  statement: string;
  risk: string;
  repair: string;
  source: string;
  excerpt: string;
}
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
    return ['statement', 'risk', 'repair', 'source', 'excerpt'].every((key) => typeof item[key] === 'string' && item[key].trim().length > 0);
  }).slice(0, 6);
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
          { role: 'system', content: '你是真源 ProofMate 的证据审计器。回答必须有节奏、有层次，只依据输入材料提取最多6条可验证主张。每条内容依次对应：结论层 statement，先说明要核验什么；依据层 source 与 excerpt，给出可追溯位置和逐字原文；风险边界 risk，说明证据能证明到哪里、还不能证明什么；下一步 repair，给出具体可执行的补证动作。找不到来源时不要输出该条，不要重复空泛建议。以 json 对象 {"claims":[{"statement":"...","risk":"...","repair":"...","source":"文件名或段落位置","excerpt":"输入中的原文摘录"}]} 返回。' },
          { role: 'user', content: input.text },
        ],
      }),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
      const safeDetail = [detail?.error?.code, detail?.error?.message].filter(Boolean).join(' · ');
      return { state: 'provider_error', message: `Qwen HTTP ${response.status}${safeDetail ? `: ${safeDetail}` : ''}` };
    }
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
