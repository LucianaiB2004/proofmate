import { calculateAuditScore, deriveAuditDimensions, getRiskCounts, linkEvidence, recalculateAudit } from './audit';
import { demoEvidence, demoProject } from '../data/demoProject';
import type { ProjectAudit } from './types';

const importedAudit = (statement = '低温密封性能得到验证'): ProjectAudit => ({
  id: 'import-score-test', name: '真实材料', score: 0,
  dimensions: { coverage: 0, consistency: 0, freshness: 0, reproducibility: 0 },
  claims: [{ id: 'claim-1', statement, status: 'missing', importance: 'high', evidenceIds: ['hint'], risk: '待核验', repair: '补充记录' }],
  evidence: [
    { id: 'source', title: '实验记录', kind: 'document', source: 'record.pdf', content: '2026-09-25 低温实验显示 O 形环密封性能合格。', excerpt: '2026-09-25 低温实验显示 O 形环密封性能合格。', extractionMethod: 'pdfjs', confidence: .8 },
    { id: 'hint', title: 'OpenVINO 定位依据', kind: 'document', source: 'OpenVINO 分析结果', excerpt: '模型认为低温密封性能有问题', relation: 'unreviewed', confidence: .45 },
  ], trace: [],
});

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

  it('gives no points to an imported claim backed only by a model hint or a fabricated quote', () => {
    const audit = importedAudit();
    expect(recalculateAudit(audit).score).toBe(0);
    const fabricated = {
      ...audit,
      claims: audit.claims.map((claim) => ({ ...claim, status: 'verified' as const, evidenceIds: ['fabricated'] })),
      evidence: [...audit.evidence, { id: 'fabricated', title: '声称的原文', kind: 'document' as const, source: 'record.pdf', excerpt: '原材料中不存在这句话', relation: 'support' as const, confidence: 1 }],
    };
    expect(recalculateAudit(fabricated).score).toBe(0);
  });

  it('scores only source-matched support and reduces consistency when a grounded conflict appears', () => {
    const audit = importedAudit();
    const support = { id: 'support', title: '实验记录摘录', kind: 'document' as const, source: 'record.pdf', excerpt: '2026-09-25 低温实验显示 O 形环密封性能合格', relation: 'support' as const, confidence: .8, reviewedByHuman: true };
    const withSupport = { ...audit, evidence: [...audit.evidence, support], claims: audit.claims.map((claim) => ({ ...claim, status: 'weak' as const, evidenceIds: ['support'] })) };
    expect(deriveAuditDimensions(withSupport)).toEqual({ coverage: 100, consistency: 100, freshness: 100, reproducibility: 50 });
    const conflict = { id: 'conflict', title: '反证摘录', kind: 'document' as const, source: 'record.pdf', excerpt: '2026-09-25 低温实验显示 O 形环密封性能合格。', relation: 'conflict' as const, confidence: .9 };
    const conflicted = { ...withSupport, evidence: [...withSupport.evidence, conflict], claims: withSupport.claims.map((claim) => ({ ...claim, status: 'conflict' as const, evidenceIds: ['support', 'conflict'] })) };
    expect(deriveAuditDimensions(conflicted).consistency).toBe(0);
    expect(recalculateAudit(conflicted).score).toBeLessThan(recalculateAudit(withSupport).score);
  });

  it('does not award time information for an unrelated date elsewhere in a long source', () => {
    const audit = importedAudit();
    audit.evidence[0].content = '2026-09-25 其他实验记录。\n低温实验显示 O 形环密封性能合格。';
    audit.evidence[0].fragments = [
      { id: 'first', evidenceId: 'source', source: 'record.pdf', locator: '段落 1', text: '2026-09-25 其他实验记录。', fingerprint: '20260925其他实验记录' },
      { id: 'second', evidenceId: 'source', source: 'record.pdf', locator: '段落 2', text: '低温实验显示 O 形环密封性能合格。', fingerprint: '低温实验显示o形环密封性能合格' },
    ];
    audit.evidence.push({ id: 'support', title: '核验摘录', kind: 'document', source: 'record.pdf', excerpt: '低温实验显示 O 形环密封性能合格', relation: 'support', confidence: .8 });
    audit.claims[0].status = 'weak';
    audit.claims[0].evidenceIds = ['support'];
    expect(deriveAuditDimensions(audit).freshness).toBe(0);
  });

  it('reopens an older imported claim marked verified when it only has an unreviewed model hint', () => {
    const audit = importedAudit();
    audit.claims[0].status = 'verified';
    const result = recalculateAudit(audit);
    expect(result.claims[0].status).toBe('missing');
    expect(result.score).toBe(0);
  });

  it('does not score a source-matched model support suggestion until a person confirms the relation', () => {
    const audit = importedAudit();
    const suggestion = { id: 'candidate', title: '候选原文', kind: 'document' as const, source: 'record.pdf', excerpt: '低温实验显示 O 形环密封性能合格', relation: 'support' as const, confidence: .95 };
    audit.evidence.push(suggestion);
    audit.claims[0].status = 'weak';
    audit.claims[0].evidenceIds = ['candidate'];
    expect(recalculateAudit(audit).score).toBe(0);
    const confirmed = { ...audit, evidence: audit.evidence.map((item) => item.id === 'candidate' ? { ...item, reviewedByHuman: true } : item) };
    expect(recalculateAudit(confirmed).score).toBeGreaterThan(0);
  });
});
