import { useEffect, useState } from 'react';

export function RuntimePanel({ text, isDemo = false }: { text: string; isDemo?: boolean }) {
  const [local, setLocal] = useState('正在探测端侧服务…');
  const [cloud, setCloud] = useState('百炼 API · 等待检测');
  const [busy, setBusy] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  useEffect(() => {
    fetch('/api/local/status').then((response) => response.json()).then((result) => {
      setLocal(result.state === 'service_ready' ? `OpenVINO · ${result.model_state}` : 'OpenVINO · 服务未启动');
    }).catch(() => setLocal('OpenVINO · 服务未启动'));
  }, []);
  const analyze = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/qwen/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const result = await response.json();
      if (result.state === 'provider_ready') {
        setCloud(`百炼 Qwen · 已核验 ${result.claims.length} 条主张`);
        setInsights(result.claims.map((claim: { statement: string; risk: string }) => `${claim.statement}｜风险：${claim.risk}`));
      } else setCloud(result.state === 'provider_not_configured' ? '百炼 Qwen · 未配置 API Key' : `百炼 Qwen · ${result.state}`);
    } catch { setCloud('百炼 Qwen · 服务连接失败'); } finally { setBusy(false); }
  };
  const analyzeLocal = async () => {
    setLocalBusy(true);
    try {
      const response = await fetch('/api/local/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const result = await response.json();
      if (result.state === 'service_ready') {
        setLocal('OpenVINO · 本地分析完成');
        setInsights([`端侧模型建议：${result.result?.summary ?? '分析完成，未返回摘要'}`]);
      } else setLocal(`OpenVINO · ${result.detail?.state ?? result.state}`);
    } catch { setLocal('OpenVINO · 服务连接失败'); } finally { setLocalBusy(false); }
  };
  return (
    <section className="runtime-panel" aria-labelledby="runtime-title">
      <div className="panel-heading"><div><p className="section-kicker">RUNTIME MATRIX</p><h2 id="runtime-title">端云运行状态</h2></div><span>透明可查</span></div>
      <div className="runtime-grid">
        <article className="is-on"><span>当前</span><strong>{isDemo ? '演示模式' : '真实材料模式'}</strong><p>{isDemo ? '内置项目回放；可用下方按钮验证实时模型。' : '浏览器已读取真实材料；模型能力按需显式启用。'}</p></article>
        <article><span>端侧</span><strong>Qwen3-4B INT4</strong><p>{local}</p><button type="button" onClick={analyzeLocal} disabled={localBusy}>{localBusy ? '分析中…' : '使用端侧模型分析'}</button></article>
        <article><span>云端</span><strong>Qwen</strong><p>{cloud}</p><button type="button" onClick={analyze} disabled={busy}>{busy ? '核验中…' : '检测并分析当前材料'}</button></article>
      </div>
      {insights.length > 0 && <div className="runtime-results" aria-live="polite"><strong>实时模型结果（待人工确认）</strong><ul>{insights.map((item) => <li key={item}>{item}</li>)}</ul></div>}
    </section>
  );
}
