import type { ProjectAudit } from '../../domain/types';

const statusLabel = { verified: '已证实', weak: '待补证', conflict: '有冲突', missing: '缺证据' } as const;

export function buildMarkdownReport(audit: ProjectAudit): string {
  const claims = audit.claims.map((claim, index) => {
    const evidence = audit.evidence.filter((item) => claim.evidenceIds.includes(item.id));
    return [
      `### ${index + 1}. ${claim.statement}`,
      `- 状态：${statusLabel[claim.status]} · 重要性：${claim.importance}`,
      `- 证据：${evidence.map((item) => `${item.title}（${item.source}）`).join('；') || '暂无'}`,
      claim.risk ? `- 风险：${claim.risk}` : '- 风险：无待处理风险',
      `- 建议：${claim.repair}`,
    ].join('\n');
  }).join('\n\n');

  return `# ${audit.name} · 可信答辩摘要

> 由真源 ProofMate 生成 · 天猫 AI 黑客松作品 · Qwen × OpenVINO

## 证据健康度

- 总分：${audit.score}/100
- 证据覆盖度：${audit.dimensions.coverage}
- 一致性：${audit.dimensions.consistency}
- 时效性：${audit.dimensions.freshness}
- 可复现性：${audit.dimensions.reproducibility}

## 核心主张与证据

${claims}

## 使用边界

本报告用于辅助整理与核验，不替代人工学术判断。演示模式的数据和分析链路均有明确标记。
`;
}

export function downloadMarkdownReport(audit: ProjectAudit): void {
  const blob = new Blob([buildMarkdownReport(audit)], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${audit.name}-可信答辩摘要.md`;
  link.click();
  URL.revokeObjectURL(url);
}
