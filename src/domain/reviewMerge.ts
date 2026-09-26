import type { Claim, EvidenceItem, ProjectAudit } from './types';
import { cleanExtractedText, normalizeFingerprint } from '../features/onboarding/cleanExtractedText';

export type ReviewFinding = {
  statement: string;
  excerpt?: string;
  source?: string;
  locator?: string;
  sourceFingerprint?: string;
  risk?: string;
  repair?: string;
  relation?: NonNullable<EvidenceItem['relation']>;
  confidence?: number;
};

export type ReviewDelta = {
  added: number;
  updated: number;
  merged: number;
  resolved: number;
  unchanged: number;
  remaining: number;
  changedClaimIds: string[];
};

function stableId(value: string) {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
}

const richer = (current: string, incoming: string) => incoming.length > current.length ? incoming : current;

function evidenceKey(item: Pick<EvidenceItem, 'sourceFingerprint' | 'source' | 'excerpt'> & { locator?: string }) {
  return `${item.sourceFingerprint || item.source}|${item.locator || ''}|${normalizeFingerprint(item.excerpt)}`;
}

export function mergeReviewRound(
  audit: ProjectAudit,
  input: ReviewFinding[],
  options: { origin: 'openvino' | 'qwen'; revision: number },
): { audit: ProjectAudit; delta: ReviewDelta } {
  const claims = audit.claims.map((claim) => ({ ...claim, evidenceIds: [...claim.evidenceIds] }));
  const evidence = audit.evidence.map((item) => ({ ...item }));
  const changedClaimIds: string[] = [];
  let added = 0; let updated = 0; let merged = 0; let unchanged = 0;

  for (const rawFinding of input) {
    const statement = cleanExtractedText(rawFinding.statement).replace(/\s+/g, ' ').trim();
    const fingerprint = normalizeFingerprint(statement);
    if (fingerprint.length < 6) { unchanged += 1; continue; }
    const excerpt = cleanExtractedText(rawFinding.excerpt ?? '').replace(/\s+/g, ' ').trim();
    const source = rawFinding.source?.trim() || `${options.origin === 'openvino' ? 'OpenVINO' : 'Qwen'} 分析结果`;
    const requestedRelation = rawFinding.relation ?? (excerpt ? 'support' : 'unreviewed');
    const relation = excerpt ? requestedRelation : 'unreviewed';
    const candidateEvidence: EvidenceItem = {
      id: `evidence-${stableId(`${rawFinding.sourceFingerprint || source}|${rawFinding.locator || ''}|${normalizeFingerprint(excerpt || statement)}`)}`,
      title: relation === 'unreviewed' && options.origin === 'openvino' ? 'OpenVINO 定位依据' : rawFinding.locator ? `${source} · ${rawFinding.locator}` : source,
      kind: 'document',
      excerpt: excerpt || '模型给出了待核验提示，但没有返回可定位的原文摘录。',
      source,
      locator: rawFinding.locator,
      sourceFingerprint: rawFinding.sourceFingerprint,
      confidence: relation === 'unreviewed' ? Math.min(rawFinding.confidence ?? 0.35, 0.45) : rawFinding.confidence ?? 0.72,
      relation,
      reason: relation === 'unreviewed' ? '为什么仍然缺证：这是模型给出的定位提示，不是来源证据，因此不计作有效支持证据。' : undefined,
    };
    const key = evidenceKey({ ...candidateEvidence, locator: rawFinding.locator });
    let linkedEvidence = evidence.find((item) => evidenceKey(item) === key);
    if (!linkedEvidence) {
      linkedEvidence = candidateEvidence;
      evidence.push(linkedEvidence);
    }

    const existing = claims.find((claim) => (claim.fingerprint || normalizeFingerprint(claim.statement)) === fingerprint);
    if (!existing) {
      const id = `claim-${stableId(fingerprint)}`;
      const claim: Claim = {
        id,
        statement,
        fingerprint,
        origin: options.origin,
        reviewRevision: options.revision,
        status: relation === 'conflict' ? 'conflict' : relation === 'support' ? 'weak' : 'missing',
        importance: 'high',
        evidenceIds: [linkedEvidence.id],
        risk: cleanExtractedText(rawFinding.risk ?? '') || '这是模型发现的待核验问题，尚缺少人工确认。',
        repair: cleanExtractedText(rawFinding.repair ?? '') || '上传能够直接支持或反驳这条主张的原始材料。',
      };
      claims.push(claim);
      changedClaimIds.push(id);
      added += 1;
      continue;
    }

    merged += 1;
    const before = JSON.stringify(existing);
    existing.fingerprint = fingerprint;
    existing.risk = richer(existing.risk, cleanExtractedText(rawFinding.risk ?? ''));
    existing.repair = richer(existing.repair, cleanExtractedText(rawFinding.repair ?? ''));
    if (!existing.evidenceIds.includes(linkedEvidence.id)) existing.evidenceIds.push(linkedEvidence.id);
    if (relation === 'conflict') existing.status = 'conflict';
    else if (relation === 'support' && existing.status === 'missing') existing.status = 'weak';
    if (JSON.stringify(existing) !== before) {
      existing.reviewRevision = options.revision;
      updated += 1;
      changedClaimIds.push(existing.id);
    } else unchanged += 1;
  }

  const remaining = claims.filter((claim) => claim.status !== 'verified').length;
  return {
    audit: { ...audit, claims, evidence },
    delta: { added, updated, merged, resolved: 0, unchanged, remaining, changedClaimIds },
  };
}
