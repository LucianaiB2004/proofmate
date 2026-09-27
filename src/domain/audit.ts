import type { AuditDimensions, ClaimStatus, EvidenceItem, ProjectAudit } from './types';
import { normalizeFingerprint } from '../features/onboarding/cleanExtractedText';

const clamp = (value: number) => Math.min(100, Math.max(0, value));
const importanceWeight = { critical: 2, high: 1.5, medium: 1 } as const;

export function findGroundedSource(audit: ProjectAudit, item: EvidenceItem): EvidenceItem | undefined {
  if (!audit.id.startsWith('import-')) return item;
  const quote = normalizeFingerprint(item.excerpt);
  if (quote.length < 8) return undefined;
  return audit.evidence.find((source) => source.content && source.extractionMethod
    && (source.id === item.id || (item.sourceFingerprint && source.sourceFingerprint === item.sourceFingerprint) || source.source === item.source)
    && normalizeFingerprint(source.content).includes(quote));
}

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
  if (!totalWeight) return { coverage: 0, consistency: 0, freshness: 0, reproducibility: 0 };

  const sourceFor = (item: EvidenceItem) => findGroundedSource(audit, item);
  let covered = 0; let consistent = 0; let dated = 0; let reviewable = 0;
  for (const claim of audit.claims) {
    const weight = importanceWeight[claim.importance];
    const linked = audit.evidence.filter((item) => claim.evidenceIds.includes(item.id));
    const support = claim.status === 'missing' ? [] : linked.filter((item) => (item.relation ?? 'support') === 'support' && sourceFor(item) && (!audit.id.startsWith('import-') || item.reviewedByHuman));
    if (!support.length) continue;
    covered += weight;
    if (claim.status !== 'conflict' && !linked.some((item) => item.relation === 'conflict' && sourceFor(item))) consistent += weight;
    if (support.some((item) => {
      const source = sourceFor(item);
      const fragment = source?.fragments?.find((part) => normalizeFingerprint(part.text).includes(normalizeFingerprint(item.excerpt)));
      return /(?:19|20)\d{2}[-/.年]\d{1,2}(?:[-/.月]\d{1,2})?/.test(fragment?.text ?? item.excerpt);
    })) dated += weight;
    reviewable += weight * (claim.status === 'verified' ? 1 : .5);
  }
  return {
    coverage: Math.round(covered / totalWeight * 100),
    consistency: Math.round(consistent / totalWeight * 100),
    freshness: Math.round(dated / totalWeight * 100),
    reproducibility: Math.round(reviewable / totalWeight * 100),
  };
}

export function recalculateAudit(audit: ProjectAudit): ProjectAudit {
  const claims = audit.id.startsWith('import-') ? audit.claims.map((claim) => {
    const linked = audit.evidence.filter((item) => claim.evidenceIds.includes(item.id));
    const hasSupport = linked.some((item) => item.relation === 'support' && item.reviewedByHuman && findGroundedSource(audit, item));
    const hasConflict = linked.some((item) => item.relation === 'conflict' && findGroundedSource(audit, item));
    if ((claim.status === 'verified' || claim.status === 'weak') && !hasSupport) return { ...claim, status: hasConflict ? 'conflict' as const : 'missing' as const, risk: claim.risk || '原有确认关系缺少可回查的支持原文，需要重新核对。', repair: '请补充可定位原文并重新确认关系。' };
    if (claim.status === 'conflict' && !hasConflict) return { ...claim, status: hasSupport ? 'weak' as const : 'missing' as const };
    return claim;
  }) : audit.claims;
  const normalized = { ...audit, claims };
  const dimensions = deriveAuditDimensions(normalized);
  return { ...normalized, dimensions, score: calculateAuditScore(dimensions) };
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
