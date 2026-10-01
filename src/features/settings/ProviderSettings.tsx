import { useEffect, useState } from 'react';
import { emptyBrowserProviderCredentials, type BrowserProviderCredentials } from './providerCredentials';

interface Status {
  dashscope: { configured: boolean; hint: string };
  textin: { configured: boolean; appIdHint: string };
}

const emptyStatus: Status = { dashscope: { configured: false, hint: '' }, textin: { configured: false, appIdHint: '' } };

export function ProviderSettings({ onClose, publicDemo = false, publicCredentials = emptyBrowserProviderCredentials, onPublicCredentialsChange, pendingOcrFiles = [] }: { onClose: () => void; publicDemo?: boolean; publicCredentials?: BrowserProviderCredentials; onPublicCredentialsChange?: (credentials: BrowserProviderCredentials) => void; pendingOcrFiles?: string[] }) {
  const [status, setStatus] = useState<Status>(emptyStatus);
  const [message, setMessage] = useState('');
  const visibleStatus = publicDemo ? {
    dashscope: { configured: Boolean(publicCredentials.dashscopeApiKey), hint: publicCredentials.dashscopeApiKey ? `…${publicCredentials.dashscopeApiKey.slice(-4)}` : '' },
    textin: { configured: Boolean(publicCredentials.textinAppId && publicCredentials.textinSecretCode), appIdHint: publicCredentials.textinAppId ? `…${publicCredentials.textinAppId.slice(-4)}` : '' },
  } : status;
  useEffect(() => {
    if (publicDemo) return;
    fetch('/api/settings').then((response) => response.json()).then(setStatus).catch(() => setMessage('暂时无法读取本机设置。'));
  }, [publicDemo]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    if (publicDemo) {
      onPublicCredentialsChange?.({ dashscopeApiKey: String(form.get('dashscopeApiKey') || publicCredentials.dashscopeApiKey), qwenModel: String(form.get('qwenModel') || publicCredentials.qwenModel || 'qwen-plus'), textinAppId: String(form.get('textinAppId') || publicCredentials.textinAppId), textinSecretCode: String(form.get('textinSecretCode') || publicCredentials.textinSecretCode) });
      element.reset();
      setMessage('已应用到本次页面；刷新页面后自动清除。');
      return;
    }
    const response = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dashscopeApiKey: form.get('dashscopeApiKey'), textinAppId: form.get('textinAppId'), textinSecretCode: form.get('textinSecretCode') }) });
    setStatus(await response.json());
    element.reset();
    setMessage('设置已保存，仅供本机代理使用。');
  };
  return <div className="settings-backdrop" role="presentation">
    <section className="provider-settings" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header><div><p className="section-kicker">{publicDemo ? 'CLOUD WORKSPACE / SESSION ONLY' : 'LOCAL CREDENTIAL VAULT'}</p><h2 id="settings-title">{publicDemo ? '云端模型与 OCR 设置' : '模型与 OCR 设置'}</h2></div><button type="button" onClick={onClose} aria-label="关闭设置">×</button></header>
      {pendingOcrFiles.length > 0 && <p className="settings-message" role="status">要继续读取 {pendingOcrFiles.join('、')}，请先配置 TextIn 凭证；保存后会自动继续，无需重新选择文件。</p>}
      <p className="settings-lead">{publicDemo ? '凭证仅保存在当前页面内存，不写入浏览器存储、源码或 Git 仓库；刷新页面后自动清除。调用时，材料会直接发送给对应服务商。浏览器端密钥仍可能被扩展或调试工具读取，请使用临时或低权限凭证，不要填写长期主账号密钥。' : '密钥只交给本机开发代理，不会进入前端构建或 Git 仓库。留空表示保留原设置。'}</p>
      <div className="provider-status"><p>百炼 Qwen · {visibleStatus.dashscope.configured ? `已配置 ${visibleStatus.dashscope.hint}` : '未配置'}</p><p>TextIn xParse · {visibleStatus.textin.configured ? `已配置 ${visibleStatus.textin.appIdHint}` : '未配置'}</p></div>
      <form onSubmit={submit}>
        <label>百炼 API Key<input name="dashscopeApiKey" type="password" autoComplete="off" /></label>
        {publicDemo && <label>Qwen 模型<input name="qwenModel" defaultValue={publicCredentials.qwenModel || 'qwen-plus'} autoComplete="off" /></label>}
        <label>TextIn App ID<input name="textinAppId" type="password" autoComplete="off" /></label>
        <label>TextIn Secret Code<input name="textinSecretCode" type="password" autoComplete="off" /></label>
        <button type="submit">{publicDemo ? '应用到本次页面' : '保存本机设置'}</button>
      </form>
      {publicDemo && (publicCredentials.dashscopeApiKey || publicCredentials.textinAppId || publicCredentials.textinSecretCode) && <button type="button" className="secondary-action" onClick={() => { onPublicCredentialsChange?.(emptyBrowserProviderCredentials); setMessage('本次页面凭证已清除。'); }}>清除本次凭证</button>}
      {message && <p className="settings-message" aria-live="polite">{message}</p>}
    </section>
  </div>;
}
