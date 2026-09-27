import type { ProjectAudit } from './types';
import { mergeReviewRound, type ReviewFinding } from './reviewMerge';

const emptyAudit = (): ProjectAudit => ({
  id: 'import-review', name: '真实材料', score: 0,
  dimensions: { coverage: 0, consistency: 100, freshness: 0, reproducibility: 0 },
  claims: [], evidence: [], trace: [],
});

const finding: ReviewFinding = {
  statement: '部署记录包含模型版本号',
  excerpt: '模型版本：Qwen3-4B INT4',
  source: '部署清单.md', locator: '段落 2', sourceFingerprint: 'deployment-v1',
  risk: '尚未记录模型哈希', repair: '补充模型哈希与构建时间', relation: 'support',
};

it('applies the same review round idempotently', () => {
  const first = mergeReviewRound(emptyAudit(), [finding], { origin: 'qwen', revision: 1 });
  const second = mergeReviewRound(first.audit, [finding], { origin: 'qwen', revision: 2 });

  expect(first.delta).toMatchObject({ added: 1, remaining: 1 });
  expect(second.audit.claims).toHaveLength(1);
  expect(second.audit.evidence).toHaveLength(1);
  expect(second.delta).toMatchObject({ added: 0, updated: 0, unchanged: 1 });
});

it('merges punctuation and Markdown variants while preserving richer guidance', () => {
  const first = mergeReviewRound(emptyAudit(), [finding], { origin: 'openvino', revision: 1 });
  const second = mergeReviewRound(first.audit, [{
    ...finding,
    statement: '## 部署记录包含模型版本号。',
    risk: '尚未记录模型哈希、量化参数和构建时间，无法复现实验环境。',
    repair: '上传包含 SHA256、量化参数、构建时间和运行环境的部署清单。',
  }], { origin: 'qwen', revision: 2 });

  expect(second.audit.claims).toHaveLength(1);
  expect(second.audit.claims[0].statement).toBe('部署记录包含模型版本号');
  expect(second.audit.claims[0].risk).toContain('无法复现实验环境');
  expect(second.delta).toMatchObject({ added: 0, updated: 1, merged: 1 });
});

it('deduplicates shared source evidence and keeps missing excerpts unreviewed', () => {
  const first = mergeReviewRound(emptyAudit(), [finding, { ...finding, statement: '部署清单给出了运行模型版本' }], { origin: 'qwen', revision: 1 });
  expect(first.audit.claims).toHaveLength(2);
  expect(first.audit.evidence).toHaveLength(1);
  expect(first.audit.claims.every((claim) => claim.evidenceIds[0] === first.audit.evidence[0].id)).toBe(true);

  const hint = mergeReviewRound(first.audit, [{ statement: '缺少训练数据版本', excerpt: '', source: 'OpenVINO 初审', risk: '无法复现', repair: '补充数据版本' }], { origin: 'openvino', revision: 2 });
  const hintEvidence = hint.audit.evidence.at(-1);
  expect(hintEvidence?.relation).toBe('unreviewed');
  expect(hintEvidence?.confidence).toBeLessThan(0.5);
  expect(hint.audit.claims.at(-1)?.status).toBe('missing');
});

it('locates a cloud quote in the uploaded source but leaves its relation for human review', () => {
  const source = {
    id: 'import-evidence-0', title: '部署清单.md', kind: 'document' as const,
    source: '部署清单.md', sourceFingerprint: 'file-v1', extractionMethod: 'browser-text' as const,
    content: '环境配置\n模型版本：Qwen3-4B INT4\n部署日期：2026-09-25',
    excerpt: '环境配置', confidence: .8,
    fragments: [{ id: 'fragment-2', evidenceId: 'import-evidence-0', source: '部署清单.md', locator: '段落 2', text: '模型版本：Qwen3-4B INT4', fingerprint: '模型版本qwen34bint4' }],
  };
  const audit = { ...emptyAudit(), evidence: [source] };
  const matched = mergeReviewRound(audit, [{ ...finding, source: '模型分析结果' }], { origin: 'qwen', revision: 1 });
  expect(matched.audit.evidence.at(-1)).toMatchObject({ relation: 'unreviewed', source: '部署清单.md', sourceFingerprint: 'file-v1', locator: '段落 2' });
  expect(matched.audit.claims[0].status).toBe('missing');

  const invented = mergeReviewRound(audit, [{ ...finding, excerpt: '原文件没有写这句话', source: '部署清单.md' }], { origin: 'qwen', revision: 1 });
  expect(invented.audit.evidence.at(-1)).toMatchObject({ relation: 'unreviewed', reason: expect.stringContaining('未在已上传材料中找到') });
  expect(invented.audit.claims[0].status).toBe('missing');
});

it('uses the named uploaded file when the same quote appears in two files', () => {
  const sameText = '模型版本：Qwen3-4B INT4';
  const files = ['草稿.md', '正式部署清单.md'].map((source, index) => ({
    id: `file-${index}`, title: source, kind: 'document' as const, source,
    sourceFingerprint: `fingerprint-${index}`, extractionMethod: 'browser-text' as const,
    content: sameText, excerpt: sameText, confidence: .8,
  }));
  const audit = { ...emptyAudit(), evidence: files };
  const result = mergeReviewRound(audit, [{ ...finding, source: '正式部署清单.md · 段落 1' }], { origin: 'qwen', revision: 1 });
  expect(result.audit.evidence.at(-1)).toMatchObject({ source: '正式部署清单.md', sourceFingerprint: 'fingerprint-1' });
  const ambiguous = mergeReviewRound(audit, [{ ...finding, source: '模型分析结果' }], { origin: 'qwen', revision: 1 });
  expect(ambiguous.audit.evidence.at(-1)?.relation).toBe('unreviewed');
});
