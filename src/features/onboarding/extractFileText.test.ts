import { extractFile, extractFileText } from './extractFileText';

it('reads browser-native text formats directly', async () => {
  const file = new File(['真实实验结论'], 'report.md', { type: 'text/markdown' });
  await expect(extractFileText(file)).resolves.toBe('真实实验结论');
});

it('delegates PDF extraction and returns its page text', async () => {
  const file = new File(['pdf-bytes'], 'report.pdf', { type: 'application/pdf' });
  const extractor = vi.fn().mockResolvedValue('第一页内容\n第二页内容');
  const xparseExtractor = vi.fn();
  await expect(extractFileText(file, extractor, xparseExtractor)).resolves.toContain('第二页内容');
  expect(extractor).toHaveBeenCalledWith(file);
  expect(xparseExtractor).not.toHaveBeenCalled();
});

it('falls back to xParse when a scanned PDF has no embedded text', async () => {
  const file = new File(['scan-bytes'], 'scan.pdf', { type: 'application/pdf' });
  const pdfExtractor = vi.fn().mockResolvedValue('   ');
  const xparseExtractor = vi.fn().mockResolvedValue('扫描页 OCR 结果');

  await expect(extractFileText(file, pdfExtractor, xparseExtractor)).resolves.toBe('扫描页 OCR 结果');
  expect(xparseExtractor).toHaveBeenCalledWith(file);
  await expect(extractFile(file, pdfExtractor, xparseExtractor)).resolves.toEqual({ text: '扫描页 OCR 结果', method: 'xparse-ocr' });
});

it('treats a PDF containing only a page number as a scan that still needs OCR', async () => {
  const file = new File(['scan'], 'numbered-scan.pdf', { type: 'application/pdf' });
  const xparseExtractor = vi.fn().mockResolvedValue('扫描正文');

  await expect(extractFile(file, vi.fn().mockResolvedValue('1'), xparseExtractor)).resolves.toEqual({ text: '扫描正文', method: 'xparse-ocr' });
});

it('delegates image extraction to xParse OCR', async () => {
  const file = new File(['pixels'], 'photo.png', { type: 'image/png' });
  const imageExtractor = vi.fn().mockResolvedValue('# 部署记录\n模型版本 Qwen3-4B INT4');
  await expect(extractFileText(file, undefined, imageExtractor)).resolves.toContain('模型版本');
  expect(imageExtractor).toHaveBeenCalledWith(file);
});
