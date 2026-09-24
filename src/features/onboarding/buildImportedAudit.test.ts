import { buildImportedAudit } from './buildImportedAudit';

it('builds an audit from the actual selected text file', async () => {
  const file = new File(['实验结果显示能耗下降 18%。\n需要补充 30 天对照实验。'], 'result.md', { type: 'text/markdown' });
  const audit = await buildImportedAudit([file]);
  expect(audit.name).toContain('result.md');
  expect(audit.evidence[0].source).toBe('result.md');
  expect(audit.claims[0].statement).toContain('能耗下降');
  expect(audit.trace[0].detail).toContain('1 份');
});

it('labels binary-only input without pretending to read its contents', async () => {
  const audit = await buildImportedAudit([new File(['binary'], 'photo.png', { type: 'image/png' })]);
  expect(audit.claims[0].statement).toContain('待模型解析');
  expect(audit.trace.some((item) => item.detail.includes('未在浏览器解读'))).toBe(true);
});
