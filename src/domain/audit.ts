import type { AuditDimensions, ClaimStatus, EvidenceItem, ProjectAudit } from './types';

const clamp = (value: number) => Math.min(100, Math.max(0, value));

export function calculateAuditScore(dimensions: AuditDimensions): number {
  const score =
    clamp(dimensions.coverage) * 0.35 +
    clamp(dimensions.consistency) * 0.25 +
    clamp(dimensions.freshness) * 0.15 +
    clamp(dimensions.reproducibility) * 0.25;
  return Math.round(score);
}

export function getRiskCounts(audit: ProjectAudit): Record<ClaimStatus, number> {
  return audit.claims.reduce<Record<ClaimStatus, number>>(
    (counts, claim) => ({ ...counts, [claim.status]: counts[claim.status] + 1 }),
    { verified: 0, weak: 0, conflict: 0, missing: 0 },
  );
}

export function linkEvidence(
  audit: ProjectAudit,
  claimId: string,
  evidence: EvidenceItem,
): ProjectAudit {
  const claim = audit.claims.find((item) => item.id === claimId);
  if (!claim || claim.evidenceIds.includes(evidence.id) || audit.evidence.some((item) => item.id === evidence.id)) {
    return audit;
  }

  const dimensions: AuditDimensions = {
    coverage: clamp(audit.dimensions.coverage + 24),
    consistency: clamp(audit.dimensions.consistency + (claim.status === 'conflict' ? 18 : 8)),
    freshness: clamp(audit.dimensions.freshness + 12),
    reproducibility: clamp(audit.dimensions.reproducibility + 20),
  };

  return {
    ...audit,
    dimensions,
    score: calculateAuditScore(dimensions),
    evidence: [...audit.evidence, evidence],
    claims: audit.claims.map((item) =>
      item.id === claimId
        ? {
            ...item,
            status: 'verified',
            evidenceIds: [...item.evidenceIds, evidence.id],
            risk: '',
            repair: '证据闭环已完成，可在答辩中直接引用。',
          }
        : item,
    ),
    trace: [
      ...audit.trace,
      {
        stage: 'device',
        label: '证据关系已重算',
        detail: `新证据“${evidence.title}”已在本地关联到核心主张。`,
      },
    ],
  };
}
