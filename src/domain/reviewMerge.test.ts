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
