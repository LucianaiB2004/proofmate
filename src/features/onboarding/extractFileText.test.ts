import { extractFileText } from './extractFileText';

it('reads browser-native text formats directly', async () => {
  const file = new File(['真实实验结论'], 'report.md', { type: 'text/markdown' });
  await expect(extractFileText(file)).resolves.toBe('真实实验结论');
});

it('delegates PDF extraction and returns its page text', async () => {
  const file = new File(['pdf-bytes'], 'report.pdf', { type: 'application/pdf' });
  const extractor = vi.fn().mockResolvedValue('第一页内容\n第二页内容');
  await expect(extractFileText(file, extractor)).resolves.toContain('第二页内容');
  expect(extractor).toHaveBeenCalledWith(file);
});

it('does not pretend images have readable text', async () => {
  const file = new File(['pixels'], 'photo.png', { type: 'image/png' });
  await expect(extractFileText(file)).resolves.toBe('');
});
