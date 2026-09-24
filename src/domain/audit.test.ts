import { calculateAuditScore, getRiskCounts, linkEvidence } from './audit';
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
    const result = linkEvidence(demoProject, 'claim-energy', demoEvidence);

    expect(result).not.toBe(demoProject);
    expect(result.score).toBeGreaterThan(80);
    expect(result.claims.find((claim) => claim.id === 'claim-energy')?.status).toBe('verified');
    expect(demoProject.claims.find((claim) => claim.id === 'claim-energy')?.status).toBe('weak');
  });

  it('counts each unresolved risk status', () => {
    expect(getRiskCounts(demoProject)).toEqual({ verified: 2, weak: 1, conflict: 1, missing: 2 });
  });
});
