type PdfExtractor = (file: File) => Promise<string>;
type ImageExtractor = (file: File) => Promise<string>;
export type ExtractionMethod = 'browser-text' | 'pdfjs' | 'xparse-ocr' | 'none';
export type ExtractedFile = { text: string; method: ExtractionMethod };

export class ExtractionFailure extends Error {
  constructor(public method: ExtractionMethod, message: string) { super(message); }
}

export function sourceFileFingerprint(file: File) {
  return [file.name, file.size, file.lastModified, file.type].join(':');
}

const directTextExtensions = new Set(['md', 'txt', 'csv', 'json']);
const imageExtensions = new Set(['png', 'jpg', 'jpeg', 'webp']);

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
  }
  return pages.join('\n').trim();
}

async function extractImage(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  const response = await fetch('/api/xparse/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, data: btoa(binary) }) });
  const result = await response.json();
  if (!response.ok || typeof result.text !== 'string') throw new Error(result.message ?? 'xParse OCR 解析失败');
  return result.text;
}

export function defaultExtractionMethod(file: File): ExtractionMethod {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (directTextExtensions.has(extension)) return 'browser-text';
  if (extension === 'pdf') return 'pdfjs';
  if (imageExtensions.has(extension)) return 'xparse-ocr';
  return 'none';
}

export async function extractFile(file: File, pdfExtractor: PdfExtractor = extractPdf, imageExtractor: ImageExtractor = extractImage): Promise<ExtractedFile> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (directTextExtensions.has(extension)) return { text: await file.text(), method: 'browser-text' };
  if (extension === 'pdf') {
    let text = '';
    try { text = await pdfExtractor(file); }
    catch (error) { throw new ExtractionFailure('pdfjs', error instanceof Error ? error.message : 'PDF 正文读取失败'); }
    if (text.replace(/\s+/g, '').length >= 8) return { text, method: 'pdfjs' };
    try { return { text: await imageExtractor(file), method: 'xparse-ocr' }; }
    catch (error) { throw new ExtractionFailure('xparse-ocr', error instanceof Error ? error.message : '扫描 PDF OCR 失败'); }
  }
  if (imageExtensions.has(extension)) {
    try { return { text: await imageExtractor(file), method: 'xparse-ocr' }; }
    catch (error) { throw new ExtractionFailure('xparse-ocr', error instanceof Error ? error.message : '图片 OCR 失败'); }
  }
  return { text: '', method: 'none' };
}

export async function extractFileText(file: File, pdfExtractor: PdfExtractor = extractPdf, imageExtractor: ImageExtractor = extractImage): Promise<string> {
  return (await extractFile(file, pdfExtractor, imageExtractor)).text;
}
