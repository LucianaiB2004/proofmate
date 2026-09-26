import { useEffect, useState } from 'react';

interface Status {
  dashscope: { configured: boolean; hint: string };
  textin: { configured: boolean; appIdHint: string };
}

const emptyStatus: Status = { dashscope: { configured: false, hint: '' }, textin: { configured: false, appIdHint: '' } };

export function ProviderSettings({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status>(emptyStatus);
  const [message, setMessage] = useState('');
  useEffect(() => { fetch('/api/settings').then((response) => response.json()).then(setStatus).catch(() => setMessage('暂时无法读取本机设置。')); }, []);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const response = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dashscopeApiKey: form.get('dashscopeApiKey'), textinAppId: form.get('textinAppId'), textinSecretCode: form.get('textinSecretCode') }) });
    setStatus(await response.json());
    element.reset();
    setMessage('设置已保存，仅供本机代理使用。');
  };
  return <div className="settings-backdrop" role="presentation">
    <section className="provider-settings" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header><div><p className="section-kicker">LOCAL CREDENTIAL VAULT</p><h2 id="settings-title">模型与 OCR 设置</h2></div><button type="button" onClick={onClose} aria-label="关闭设置">×</button></header>
      <p className="settings-lead">密钥只交给本机开发代理，不会进入前端构建或 Git 仓库。留空表示保留原设置。</p>
      <div className="provider-status"><p>百炼 Qwen · {status.dashscope.configured ? `已配置 ${status.dashscope.hint}` : '未配置'}</p><p>TextIn xParse · {status.textin.configured ? `已配置 ${status.textin.appIdHint}` : '未配置'}</p></div>
      <form onSubmit={submit}>
        <label>百炼 API Key<input name="dashscopeApiKey" type="password" autoComplete="off" /></label>
        <label>TextIn App ID<input name="textinAppId" type="password" autoComplete="off" /></label>
        <label>TextIn Secret Code<input name="textinSecretCode" type="password" autoComplete="off" /></label>
        <button type="submit">保存本机设置</button>
      </form>
      {message && <p className="settings-message" aria-live="polite">{message}</p>}
    </section>
  </div>;
}
