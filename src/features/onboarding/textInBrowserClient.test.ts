import { describe, expect, it, vi } from 'vitest';
import { parseWithTextInBrowser } from './textInBrowserClient';

describe('parseWithTextInBrowser', () => {
  it('posts the original bytes and returns markdown from xParse', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ code: 200, data: { markdown: '# OCR result' } }) }));
    const file = new File(['image-bytes'], 'scan.jpg', { type: 'image/jpeg' });
    await expect(parseWithTextInBrowser(file, { appId: 'app-id', secretCode: 'secret' }, fetchMock as unknown as typeof fetch)).resolves.toBe('# OCR result');
    expect(fetchMock).toHaveBeenCalledWith('https://api.textin.com/ai/service/v1/pdf_to_markdown', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'x-ti-app-id': 'app-id', 'x-ti-secret-code': 'secret' }) }));
  });
});
