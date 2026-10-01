export interface TextInBrowserCredentials { appId: string; secretCode: string }

export async function parseWithTextInBrowser(file: File, credentials: TextInBrowserCredentials, fetchImpl: typeof fetch = fetch) {
  if (!credentials.appId || !credentials.secretCode) throw new Error('请先在“模型与 OCR 设置”中填写 TextIn App ID 和 Secret Code。');
  const response = await fetchImpl('https://api.textin.com/ai/service/v1/pdf_to_markdown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'x-ti-app-id': credentials.appId, 'x-ti-secret-code': credentials.secretCode },
    body: await file.arrayBuffer(),
  });
  const payload = await response.json() as { code?: number; message?: string; data?: { markdown?: string } };
  if (!response.ok || payload.code !== 200) throw new Error(payload.message || `xParse HTTP ${response.status}`);
  if (typeof payload.data?.markdown !== 'string') throw new Error('xParse 返回内容为空');
  return payload.data.markdown;
}
