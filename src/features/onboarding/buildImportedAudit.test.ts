import { buildImportedAudit } from './buildImportedAudit';

it('builds readable located evidence without pretending extracted lines are claims', async () => {
  const file = new File(['# 实验结果\n\n<table><tr><td>测试结果显示能耗下降 18%</td></tr></table>\n\n需要补充 30 天对照实验。'], 'result.md', { type: 'text/markdown' });
  const audit = await buildImportedAudit([file]);
  expect(audit.name).toContain('result.md');
  expect(audit.evidence[0].source).toBe('result.md');
  expect(audit.evidence[0].content).toContain('能耗下降 18%');
  expect(audit.evidence[0].content).not.toMatch(/#|<\/?(?:table|tr|td)>/i);
  expect(audit.evidence[0].fragments?.map((item) => item.locator)).toEqual(['段落 1', '段落 2']);
  expect(audit.claims).toEqual([]);
  expect(audit.trace[0].detail).toContain('1 份');
  expect(audit.trace.some((item) => item.detail.includes('端侧初审待运行'))).toBe(true);
});

it('labels a failed image OCR without pretending to read its contents', async () => {
  const audit = await buildImportedAudit([new File(['binary'], 'photo.png', { type: 'image/png' })]);
  expect(audit.claims).toEqual([]);
  expect(audit.evidence[0].excerpt).toContain('xParse OCR 解析失败');
  expect(audit.trace.some((item) => item.detail.includes('photo.png'))).toBe(true);
});

it('records successful xParse OCR as a traceable image source', async () => {
  const file = new File(['pixels'], 'deployment.png', { type: 'image/png' });
  const audit = await buildImportedAudit([file], async () => '部署记录显示模型版本 Qwen3-4B INT4。');
  expect(audit.claims).toEqual([]);
  expect(audit.evidence[0].content).toBe('部署记录显示模型版本 Qwen3-4B INT4。');
  expect(audit.evidence[0].extractionMethod).toBe('xparse-ocr');
  expect(audit.trace.some((item) => item.detail.includes('TextIn xParse OCR'))).toBe(true);
});

it('keeps the extracted PDF text available beyond the short evidence excerpt', async () => {
  const extracted = `第一页结论。${'这是需要在材料阅读器中保留的正文。'.repeat(30)}`;
  const file = new File(['pdf'], '答辩材料.pdf', { type: 'application/pdf' });
  const audit = await buildImportedAudit([file], async () => extracted);

  expect(audit.evidence[0].excerpt.length).toBeLessThan(extracted.length);
  expect(audit.evidence[0].content).toBe(extracted);
  expect(audit.evidence[0].extractionMethod).toBe('pdfjs');
});

it('preserves a PDF extraction error instead of calling it model work', async () => {
  const file = new File(['broken'], 'encrypted.pdf', { type: 'application/pdf' });
  const audit = await buildImportedAudit([file], async () => { throw new Error('文档已加密'); });
  expect(audit.evidence[0].excerpt).toContain('PDF 解析失败：文档已加密');
  expect(audit.trace.some((item) => item.detail.includes('encrypted.pdf'))).toBe(true);
});

it('keeps readable fragments linked to their real source when another file fails', async () => {
  const failed = new File(['broken'], 'broken.pdf', { type: 'application/pdf' });
  const readable = new File(['实验结果显示准确率提升 12%。'], 'result.txt', { type: 'text/plain' });
  const audit = await buildImportedAudit([failed, readable], async (file) => {
    if (file === failed) throw new Error('无法读取');
    return file.text();
  });
  expect(audit.claims).toEqual([]);
  expect(audit.evidence[1].fragments?.[0].evidenceId).toBe('import-evidence-1');
  expect(audit.evidence[1].source).toBe('result.txt');
});
