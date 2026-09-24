import { demoProject } from '../../data/demoProject';
import { buildMarkdownReport } from './buildReport';

it('exports every critical claim and unresolved risk without secrets', () => {
  const report = buildMarkdownReport(demoProject);
  const critical = demoProject.claims.filter((claim) => claim.importance === 'critical');

  critical.forEach((claim) => expect(report).toContain(claim.statement));
  demoProject.claims.filter((claim) => claim.status !== 'verified').forEach((claim) => expect(report).toContain(claim.risk));
  expect(report).toContain('Qwen × OpenVINO');
  expect(report).not.toMatch(/DASHSCOPE_API_KEY|sk-[A-Za-z0-9]/);
});
