import { useRef, useState } from 'react';
import type { Claim, EvidenceItem } from '../../domain/types';

export function RiskInspector({ claim, evidence, repaired, notice, onRepair, onEvidenceUpload, onConfirmEvidence }: { claim: Claim; evidence: EvidenceItem[]; repaired: boolean; notice?: string; onRepair: () => void; onEvidenceUpload: (file: File) => Promise<void>; onConfirmEvidence: () => void }) {
  const sources = evidence.filter((item) => claim.evidenceIds.includes(item.id));
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try { await onEvidenceUpload(file); } finally { setUploading(false); }
  };
  return (
    <section className="risk-panel" role="region" aria-label="风险检查器">
      <p className="section-kicker">REVIEWER MARGIN / RED PEN</p>
      <h2>{claim.status === 'verified' ? '证据闭环' : '为什么有风险？'}</h2>
      <p className="risk-copy">{claim.risk || '这条主张已经形成可追溯证据链。'}</p>
      <div className="source-stack">
        {sources.map((item, index) => <article key={item.id}><header><span>证据 {String(index + 1).padStart(2, '0')} · {item.kind}</span><strong>{item.title}</strong></header><blockquote>{item.excerpt}</blockquote><footer>{item.source} · 可信度 {Math.round(item.confidence * 100)}%</footer></article>)}
      </div>
      <div className="repair-box"><span>建议修复</span><p>{claim.repair}</p></div>
      {notice && <div className="evidence-found" role="status"><strong>找到证据啦</strong><p>{notice}</p></div>}
      {claim.id === 'claim-energy' ? <button className="repair-action" type="button" onClick={onRepair} disabled={repaired}>{repaired ? '30 天对照实验已入链' : '补充 30 天对照实验'}</button> : <>
        <input ref={inputRef} className="visually-hidden" aria-label="按建议上传证据文件" type="file" accept=".pdf,.md,.txt,.csv,.json" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
        <button className="repair-action" type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>{uploading ? '正在读取证据…' : '按建议上传证据'}</button>
        {sources.length > 0 && claim.status !== 'verified' && <button className="confirm-evidence-action" type="button" onClick={onConfirmEvidence}>确认关系并完成审阅</button>}
      </>}
    </section>
  );
}
