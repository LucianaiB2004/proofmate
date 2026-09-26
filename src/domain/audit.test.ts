import { calculateAuditScore, deriveAuditDimensions, getRiskCounts, linkEvidence, recalculateAudit } from './audit';
import { demoEvidence, demoProject } from '../data/demoProject';

describe('evidence audit domain', () => {
  it('weights coverage 35, consistency 25, freshness 15 and reproducibility 25 percent', () => {
    expect(
      calculateAuditScore({
        coverage: 80,
        consistency: 60,
        freshness: 100,
        reproducibility: 40,
      }),
    ).toBe(68);
  });

  it('does not raise the score when the same evidence is linked twice', () => {
    const once = linkEvidence(demoProject, 'claim-energy', demoEvidence);
    const twice = linkEvidence(once, 'claim-energy', demoEvidence);

    expect(twice.score).toBe(once.score);
    expect(twice.evidence.filter((item) => item.id === demoEvidence.id)).toHaveLength(1);
  });

  it('links new evidence immutably and resolves the target claim', () => {
    const baseline = recalculateAudit(demoProject);
    const result = linkEvidence(baseline, 'claim-energy', demoEvidence);

    expect(result).not.toBe(demoProject);
    expect(result.score).toBeGreaterThan(baseline.score);
    expect(result.claims.find((claim) => claim.id === 'claim-energy')?.status).toBe('verified');
    expect(demoProject.claims.find((claim) => claim.id === 'claim-energy')?.status).toBe('weak');
  });

  it('counts each unresolved risk status', () => {
    expect(getRiskCounts(demoProject)).toEqual({ verified: 2, weak: 1, conflict: 1, missing: 2 });
  });

  it('always derives the displayed score from the current claims and evidence', () => {
    const recalculated = recalculateAudit(demoProject);
    expect(recalculated.dimensions).toEqual(deriveAuditDimensions(recalculated));
    expect(recalculated.score).toBe(calculateAuditScore(recalculated.dimensions));
  });

  it('does not award points for duplicate evidence and reopens verified claims on conflict', () => {
    const verified = linkEvidence(demoProject, 'claim-energy', demoEvidence);
    const duplicate = linkEvidence(verified, 'claim-energy', demoEvidence);
    expect(duplicate.score).toBe(verified.score);

    const conflicted = recalculateAudit({
      ...verified,
      evidence: [...verified.evidence, { id: 'conflict-new', title: '复算结果', kind: 'data', excerpt: '复算后仅下降 3%', source: '复算.csv', confidence: 0.95, relation: 'conflict' }],
      claims: verified.claims.map((claim) => claim.id === 'claim-energy' ? { ...claim, status: 'conflict', evidenceIds: [...claim.evidenceIds, 'conflict-new'] } : claim),
    });
    expect(conflicted.claims.find((claim) => claim.id === 'claim-energy')?.status).toBe('conflict');
    expect(conflicted.score).toBeLessThan(verified.score);
  });
});
