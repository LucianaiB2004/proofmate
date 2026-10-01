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

function scopedClaims(text: string): Map<number, string> {
  const reviewScope = text.split('【上传原文】', 1)[0];
  return new Map([...reviewScope.matchAll(/【待复核主张\s+(\d+)】([^\n]+)/g)].map((match) => [Number(match[1]), match[2].trim()]));
}

function containsUnsupportedIdentifier(value: string, input: string) {
  return (value.match(/[A-Za-z][A-Za-z0-9-]{2,}/g) ?? []).some((token) => !input.toLowerCase().includes(token.toLowerCase()));
}

function parseClaims(content: string, scope: Map<number, string>, input: string): QwenClaim[] {
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned) as { claims?: unknown };
  if (!Array.isArray(parsed.claims)) throw new Error('Qwen response has no claims array');
  const valid = parsed.claims.filter((claim): claim is QwenClaim & { claim_index?: number } => {
    if (typeof claim !== 'object' || claim === null) return false;
    const item = claim as Record<string, unknown>;
    return ['statement', 'risk', 'repair', 'source', 'excerpt'].every((key) => typeof item[key] === 'string' && item[key].trim().length > 0);
  });
  if (!scope.size) return valid.slice(0, 6).map(({ statement, risk, repair, source, excerpt }) => ({ statement, risk, repair, source, excerpt }));
  const seen = new Set<number>();
  return valid.flatMap((item) => {
    const index = Number.isInteger(item.claim_index) && scope.has(item.claim_index!)
      ? item.claim_index!
      : [...scope].find(([, statement]) => statement === item.statement)?.[0];
    if (!index || seen.has(index)) return [];
    seen.add(index);
    const statement = scope.get(index)!;
    return [{
      statement,
      risk: containsUnsupportedIdentifier(item.risk, input) ? `当前材料尚不足以核验“${statement}”；请对照原文检查适用条件与反例。` : item.risk,
      repair: containsUnsupportedIdentifier(item.repair, input) ? `请补充能直接核验“${statement}”的原始记录，注明文件、时间范围、关键字段和页码。` : item.repair,
      source: item.source,
      excerpt: item.excerpt,
    }];
  }).slice(0, 6);
}

export async function analyzeWithQwen(
  input: QwenInput,
  fetchImpl: typeof fetch = fetch,
  options: QwenOptions = {},
): Promise<QwenResult> {
  const runtimeEnv = typeof process === 'undefined' ? {} : process.env;
  const apiKey = options.apiKey ?? runtimeEnv.DASHSCOPE_API_KEY ?? '';
  if (!apiKey) return { state: 'provider_not_configured' };
  const scope = scopedClaims(input.text);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);
  try {
    const response = await fetchImpl('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: options.model ?? runtimeEnv.QWEN_MODEL ?? 'qwen-plus',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${scope.size ? `只复核输入中编号 1 至 ${scope.size} 的【待复核主张】，不得新增主张。每条结果带 claim_index，statement 必须逐字复制该编号的原主张；找不到原文可不输出。` : '只依据输入材料中明确写出的肯定性结论提取最多6条可验证主张。不要新增隐含主张或因果结论。'}你是真源 ProofMate 的证据审计器。回答必须有节奏、有层次。不要把“没有说明某事”改写成“某事未发生”。每条内容依次对应：结论层 statement，先说明要核验什么；依据层 source 与 excerpt，给出可追溯位置和逐字原文；风险边界 risk，说明证据能证明到哪里、还不能证明什么；下一步 repair，给出具体可执行的补证动作。repair 只能要求输入中可核对的材料、字段、时间范围或验证方法，不得虚构输入中未出现的标准名称、规范编号、机构要求或数据来源，也不要给出猜测的档案编号和具体数值。找不到来源时不要输出该条。以 json 对象 {"claims":[{"claim_index":1,"statement":"...","risk":"...","repair":"...","source":"文件名或段落位置","excerpt":"输入中的原文摘录"}]} 返回。` },
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
    return { state: 'provider_ready', claims: parseClaims(content, scope, input.text) };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return { state: 'provider_timeout' };
    return { state: 'provider_error', message: error instanceof Error ? error.message : '未知请求错误' };
  } finally {
    clearTimeout(timeout);
  }
}
