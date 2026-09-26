type PdfExtractor = (file: File) => Promise<string>;
type ImageExtractor = (file: File) => Promise<string>;

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

export async function extractFileText(file: File, pdfExtractor: PdfExtractor = extractPdf, imageExtractor: ImageExtractor = extractImage): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (directTextExtensions.has(extension)) return file.text();
  if (extension === 'pdf') return pdfExtractor(file);
  if (imageExtensions.has(extension)) return imageExtractor(file);
  return '';
}
