type PdfExtractor = (file: File) => Promise<string>;

const directTextExtensions = new Set(['md', 'txt', 'csv', 'json']);

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

export async function extractFileText(file: File, pdfExtractor: PdfExtractor = extractPdf): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (directTextExtensions.has(extension)) return file.text();
  if (extension === 'pdf') return pdfExtractor(file);
  return '';
}
