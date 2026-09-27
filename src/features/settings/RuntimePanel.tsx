import { useEffect, useState } from 'react';
import type { QwenClaim } from '../../../server/qwenClient';
import type { ReviewDelta } from '../../domain/reviewMerge';

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export function RuntimePanel({ text, cloudText = text, isDemo = false, scopeCount, onAcceptLocalInsight, onAcceptQwenFindings }: { text: string; cloudText?: string; isDemo?: boolean; scopeCount?: number; onAcceptLocalInsight?: (summary: string) => ReviewDelta | void; onAcceptQwenFindings?: (claims: QwenClaim[]) => ReviewDelta | void }) {
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
  const [reviewTitle, setReviewTitle] = useState('');
  const [archiveResult, setArchiveResult] = useState('');
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
    if (busy || localBusy) return;
    setBusy(true);
    setReviewTitle('');
    setInsights([]);
    setLocalInsight('');
    setQwenFindings([]);
    setArchiveResult('');
    try {
      const response = await fetch('/api/qwen/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: cloudText }) });
      const result = await response.json();
      if (result.state === 'provider_ready') {
        setCloud(`百炼 Qwen · 返回 ${result.claims.length} 条复核建议`);
        setQwenFindings(result.claims);
        setQwenAccepted(false);
        setLocalInsight('');
        setReviewTitle('云端复核完成');
        setInsights(result.claims.length
          ? result.claims.map((claim: QwenClaim) => `【结论】${claim.statement}\n【依据】${claim.source}｜${claim.excerpt}\n【风险边界】${claim.risk}\n【下一步】${claim.repair}`)
          : ['没有找到同时具备来源和原文摘录的主张，因此本次没有内容进入待确认档案。可补充正文更完整、来源更明确的材料后重试。']);
      } else {
        const reason = result.state === 'provider_not_configured'
          ? '尚未配置百炼 API Key，请在“模型与 OCR 设置”中填写自己的密钥。'
          : result.state === 'provider_timeout'
            ? '云端模型响应超时，本次没有生成结果；原档案未被修改。'
            : result.message || `服务返回状态：${result.state}`;
        setCloud(result.state === 'provider_not_configured' ? '百炼 Qwen · 未配置 API Key' : `百炼 Qwen · ${result.state}`);
        setQwenFindings([]);
        setReviewTitle('云端复核没有完成');
        setInsights([reason]);
      }
    } catch {
      setCloud('百炼 Qwen · 服务连接失败');
      setQwenFindings([]);
      setReviewTitle('云端复核没有完成');
      setInsights(['无法连接云端复核服务，请确认页面服务仍在运行后重试；原档案未被修改。']);
    } finally { setBusy(false); }
  };
  const analyzeLocal = async () => {
    if (busy || localBusy) return;
    setLocalElapsed(0);
    setLocalBusy(true);
    setReviewTitle('');
    setInsights([]);
    setLocalInsight('');
    setQwenFindings([]);
    setArchiveResult('');
    try {
      const response = await fetch('/api/local/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const result = await response.json();
      if (result.state === 'service_ready') {
        const summary = result.result?.summary ?? '分析完成，未返回摘要';
        setLocal('OpenVINO · 本地分析完成');
        setLocalInsight(summary);
        setLocalAccepted(false);
        setQwenFindings([]);
        setReviewTitle('本地分析完成 · 待人工确认');
        setInsights([`端侧模型建议：${summary}`]);
      } else setLocal(`OpenVINO · ${result.detail?.state ?? result.state}`);
    } catch { setLocal('OpenVINO · 服务连接失败'); } finally { setLocalBusy(false); }
  };
  return (
    <section className="runtime-panel" aria-labelledby="runtime-title">
      <div className="panel-heading"><div><p className="section-kicker">RUNTIME MATRIX</p><h2 id="runtime-title">端云运行状态</h2></div><span>透明可查</span></div>
      <div className="runtime-grid">
        <article className="is-on runtime-mode"><span>当前档位</span><strong>{isDemo ? '演示模式' : '真实材料模式'}</strong><p>{isDemo ? '内置项目回放；可用右侧按钮验证实时模型。' : '文件提取不是模型分析。OpenVINO 是第一遍模型初审，Qwen 只复核尚未解决的主张。'}</p></article>
        <article className={`runtime-instrument${localBusy ? ' is-analyzing' : ''}`}><span className="instrument-label"><i aria-hidden="true" />DEVICE / LOCAL · FIRST PASS</span><h3>本地分析仪</h3><strong>Qwen3-4B INT4</strong><p>{local}</p>{localBusy && <div className="analysis-progress" role="status" aria-live="polite"><span className="analysis-pulse" aria-hidden="true" /><div><strong>正在分析 · {formatElapsed(localElapsed)}</strong><small>{localElapsed < 4 ? '正在读取材料与定位主张' : localElapsed < 12 ? '正在核对证据与风险边界' : '正在整理可执行的补证建议'}</small></div></div>}<button type="button" onClick={analyzeLocal} disabled={localBusy || busy}>{localBusy ? `分析中 ${formatElapsed(localElapsed)}` : busy ? '等待云端复核完成' : '使用端侧模型分析'}</button></article>
        <article className="runtime-instrument"><span className="instrument-label"><i aria-hidden="true" />CLOUD / UNRESOLVED REVIEW</span><h3>云端复核仪</h3><strong>Qwen</strong><p>{cloud}</p>{!isDemo && <small>复核时会把未解决主张及上传原文片段发给百炼；返回的摘录仍须与原文件逐字核对。</small>}<button type="button" onClick={analyze} disabled={busy || localBusy || scopeCount === 0}>{busy ? '核验中…' : localBusy ? '等待本地分析完成' : scopeCount !== undefined ? `复核 ${scopeCount} 条未解决主张` : '检测并分析当前材料'}</button></article>
      </div>
      {reviewTitle && <div className="runtime-results" data-testid="human-review-slip" aria-live="polite"><strong>{reviewTitle}</strong><p>{qwenFindings.length || localInsight ? '以下是实时模型建议，确认前不会写入已确认事实。' : '本次运行状态和原因如下。'}</p><ul>{insights.map((item) => <li key={item}>{item}</li>)}</ul>{archiveResult && <p className="review-delta">{archiveResult}</p>}{localInsight && onAcceptLocalInsight && <button type="button" className="accept-insight" disabled={localAccepted} onClick={() => { const delta = onAcceptLocalInsight(localInsight); if (delta) setArchiveResult(delta.added || delta.updated || delta.resolved ? `本轮变化：新增 ${delta.added}、更新 ${delta.updated}、合并 ${delta.merged}、解决 ${delta.resolved}；剩余 ${delta.remaining} 条待复核。` : `本轮无新增变化；剩余 ${delta.remaining} 条待复核。`); setLocalAccepted(true); }}>{localAccepted ? '已加入档案' : '确认并加入档案'}</button>}{qwenFindings.length > 0 && onAcceptQwenFindings && <button type="button" className="accept-insight" disabled={qwenAccepted} onClick={() => { const delta = onAcceptQwenFindings(qwenFindings); if (delta) setArchiveResult(delta.added || delta.updated || delta.resolved ? `本轮变化：新增 ${delta.added}、更新 ${delta.updated}、合并 ${delta.merged}、解决 ${delta.resolved}；剩余 ${delta.remaining} 条待复核。` : `本轮无新增变化；剩余 ${delta.remaining} 条待复核。`); setQwenAccepted(true); }}>{qwenAccepted ? '云端发现已加入档案' : `确认 ${qwenFindings.length} 条云端发现并加入档案`}</button>}</div>}
    </section>
  );
}
