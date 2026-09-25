import { useEffect, useState } from 'react';
import type { QwenClaim } from '../../../server/qwenClient';

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export function RuntimePanel({ text, isDemo = false, onAcceptLocalInsight, onAcceptQwenFindings }: { text: string; isDemo?: boolean; onAcceptLocalInsight?: (summary: string) => void; onAcceptQwenFindings?: (claims: QwenClaim[]) => void }) {
  const [local, setLocal] = useState('正在探测端侧服务…');
  const [cloud, setCloud] = useState('百炼 API · 等待检测');
  const [busy, setBusy] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);
  const [localElapsed, setLocalElapsed] = useState(0);
  const [insights, setInsights] = useState<string[]>([]);
  const [localInsight, setLocalInsight] = useState('');
  const [localAccepted, setLocalAccepted] = useState(false);
  const [qwenFindings, setQwenFindings] = useState<QwenClaim[]>([]);
  const [qwenAccepted, setQwenAccepted] = useState(false);
  useEffect(() => {
    fetch('/api/local/status').then((response) => response.json()).then((result) => {
      const device = result.device_name ? `${result.device} · ${result.device_name}` : result.model_state;
      setLocal(result.state === 'service_ready' ? `OpenVINO · ${device}` : 'OpenVINO · 服务未启动');
    }).catch(() => setLocal('OpenVINO · 服务未启动'));
  }, []);
  useEffect(() => {
    if (!localBusy) return;
    const timer = window.setInterval(() => setLocalElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [localBusy]);
  const analyze = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/qwen/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const result = await response.json();
      if (result.state === 'provider_ready') {
        setCloud(`百炼 Qwen · 已核验 ${result.claims.length} 条主张`);
        setQwenFindings(result.claims);
        setQwenAccepted(false);
        setLocalInsight('');
        setInsights(result.claims.map((claim: QwenClaim) => `${claim.statement}｜风险：${claim.risk}\n来源：${claim.source}\n原文：${claim.excerpt}\n补证：${claim.repair}`));
      } else setCloud(result.state === 'provider_not_configured' ? '百炼 Qwen · 未配置 API Key' : `百炼 Qwen · ${result.state}`);
    } catch { setCloud('百炼 Qwen · 服务连接失败'); } finally { setBusy(false); }
  };
  const analyzeLocal = async () => {
    setLocalElapsed(0);
    setLocalBusy(true);
    try {
      const response = await fetch('/api/local/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const result = await response.json();
      if (result.state === 'service_ready') {
        const summary = result.result?.summary ?? '分析完成，未返回摘要';
        setLocal('OpenVINO · 本地分析完成');
        setLocalInsight(summary);
        setLocalAccepted(false);
        setQwenFindings([]);
        setInsights([`端侧模型建议：${summary}`]);
      } else setLocal(`OpenVINO · ${result.detail?.state ?? result.state}`);
    } catch { setLocal('OpenVINO · 服务连接失败'); } finally { setLocalBusy(false); }
  };
  return (
    <section className="runtime-panel" aria-labelledby="runtime-title">
      <div className="panel-heading"><div><p className="section-kicker">RUNTIME MATRIX</p><h2 id="runtime-title">端云运行状态</h2></div><span>透明可查</span></div>
      <div className="runtime-grid">
        <article className="is-on runtime-mode"><span>当前档位</span><strong>{isDemo ? '演示模式' : '真实材料模式'}</strong><p>{isDemo ? '内置项目回放；可用右侧按钮验证实时模型。' : '浏览器已读取真实材料；模型能力按需显式启用。'}</p></article>
        <article className={`runtime-instrument${localBusy ? ' is-analyzing' : ''}`}><span className="instrument-label"><i aria-hidden="true" />DEVICE / LOCAL</span><h3>本地分析仪</h3><strong>Qwen3-4B INT4</strong><p>{local}</p>{localBusy && <div className="analysis-progress" role="status" aria-live="polite"><span className="analysis-pulse" aria-hidden="true" /><div><strong>正在分析 · {formatElapsed(localElapsed)}</strong><small>{localElapsed < 4 ? '正在读取材料与定位主张' : localElapsed < 12 ? '正在核对证据与风险边界' : '正在整理可执行的补证建议'}</small></div></div>}<button type="button" onClick={analyzeLocal} disabled={localBusy}>{localBusy ? `分析中 ${formatElapsed(localElapsed)}` : '使用端侧模型分析'}</button></article>
        <article className="runtime-instrument"><span className="instrument-label"><i aria-hidden="true" />CLOUD / REVIEW</span><h3>云端复核仪</h3><strong>Qwen</strong><p>{cloud}</p><button type="button" onClick={analyze} disabled={busy}>{busy ? '核验中…' : '检测并分析当前材料'}</button></article>
      </div>
      {insights.length > 0 && <div className="runtime-results" data-testid="human-review-slip" aria-live="polite"><strong>待人工确认</strong><p>以下是实时模型建议，尚未写入已确认事实。</p><ul>{insights.map((item) => <li key={item}>{item}</li>)}</ul>{localInsight && onAcceptLocalInsight && <button type="button" className="accept-insight" disabled={localAccepted} onClick={() => { onAcceptLocalInsight(localInsight); setLocalAccepted(true); }}>{localAccepted ? '已加入档案' : '确认并加入档案'}</button>}{qwenFindings.length > 0 && onAcceptQwenFindings && <button type="button" className="accept-insight" disabled={qwenAccepted} onClick={() => { onAcceptQwenFindings(qwenFindings); setQwenAccepted(true); }}>{qwenAccepted ? '云端发现已加入档案' : `确认 ${qwenFindings.length} 条云端发现并加入档案`}</button>}</div>}
    </section>
  );
}
