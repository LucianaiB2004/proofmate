import { demoCases } from './demoCases';

it('offers several traceable practice cases with public sources', () => {
  expect(demoCases).toHaveLength(4);
  demoCases.forEach((item) => {
    expect(item.project.claims.length).toBeGreaterThanOrEqual(3);
    expect(item.project.evidence.length).toBeGreaterThanOrEqual(3);
    expect(item.sourceUrl).toMatch(/^https:\/\//);
    expect(item.provenance).toMatch(/原创|公开/);
  });
});
