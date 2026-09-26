import type { AuditDimensions, ClaimStatus, EvidenceItem, ProjectAudit } from './types';

const clamp = (value: number) => Math.min(100, Math.max(0, value));
const importanceWeight = { critical: 2, high: 1.5, medium: 1 } as const;

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

export function deriveAuditDimensions(audit: ProjectAudit): AuditDimensions {
  const totalWeight = audit.claims.reduce((sum, claim) => sum + importanceWeight[claim.importance], 0);
  const linked = (claimId: string) => {
    const claim = audit.claims.find((item) => item.id === claimId);
    return audit.evidence.filter((item) => claim?.evidenceIds.includes(item.id));
  };
  const weightedRatio = (predicate: (claim: ProjectAudit['claims'][number]) => boolean) => totalWeight
    ? audit.claims.reduce((sum, claim) => sum + (predicate(claim) ? importanceWeight[claim.importance] : 0), 0) / totalWeight * 100
    : 0;
  const hasSupport = (claim: ProjectAudit['claims'][number]) => claim.status !== 'missing' && linked(claim.id).some((item) => (item.relation ?? 'support') === 'support');
  const coverage = weightedRatio(hasSupport);
  const consistency = totalWeight ? 100 - weightedRatio((claim) => claim.status === 'conflict') : 0;
  const datedEvidence = audit.evidence.filter((item) => /(?:19|20)\d{2}(?:[-/.年]\d{1,2})?|\d{4}-\d{2}-\d{2}/.test(`${item.source} ${item.content ?? ''} ${item.excerpt}`)).length;
  const freshness = audit.evidence.length ? datedEvidence / audit.evidence.length * 100 : 0;
  const reproducibility = totalWeight ? audit.claims.reduce((sum, claim) => {
    const evidence = linked(claim.id);
    const traceable = evidence.some((item) => (item.relation ?? 'support') === 'support' && !/分析结果|定位依据/.test(item.source));
    const value = claim.status === 'verified' ? 100 : traceable ? 50 : 0;
    return sum + value * importanceWeight[claim.importance];
  }, 0) / totalWeight : 0;
  return { coverage: Math.round(coverage), consistency: Math.round(consistency), freshness: Math.round(freshness), reproducibility: Math.round(reproducibility) };
}

export function recalculateAudit(audit: ProjectAudit): ProjectAudit {
  const dimensions = deriveAuditDimensions(audit);
  return { ...audit, dimensions, score: calculateAuditScore(dimensions) };
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

  return recalculateAudit({
    ...audit,
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
  });
}
