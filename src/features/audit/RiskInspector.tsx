import { useRef, useState } from 'react';
import type { Claim, EvidenceItem } from '../../domain/types';

export function RiskInspector({ claim, evidence, repaired, notice, onRepair, onEvidenceUpload, onConfirmEvidence, onReviewEvidenceRelation, reviewableEvidenceIds = new Set<string>(), confirmableEvidenceIds = new Set<string>() }: { claim: Claim; evidence: EvidenceItem[]; repaired: boolean; notice?: { title: string; text: string }; onRepair: () => void; onEvidenceUpload: (files: File[]) => Promise<void>; onConfirmEvidence: () => void; onReviewEvidenceRelation?: (evidenceId: string, relation: 'support' | 'conflict') => void; reviewableEvidenceIds?: Set<string>; confirmableEvidenceIds?: Set<string> }) {
  const sources = evidence.filter((item) => claim.evidenceIds.includes(item.id));
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const upload = async (files: File[]) => {
    if (!files.length) return;
    const batch = files.slice(0, 5);
    setUploadCount(batch.length);
    setUploading(true);
    try { await onEvidenceUpload(batch); } finally { setUploading(false); setUploadCount(0); }
  };
  return (
    <section className="risk-panel" role="region" aria-label="风险检查器">
      <p className="section-kicker">REVIEWER MARGIN / RED PEN</p>
      <h2>{claim.status === 'verified' ? '证据闭环' : '为什么有风险？'}</h2>
      <h3 className="selected-claim-detail">{claim.statement}</h3>
      <p className="risk-copy">{claim.risk || '这条主张已经形成可追溯证据链。'}</p>
      <div className="source-stack">
        {sources.map((item, index) => {
          const relation = item.relation ?? 'support';
          const relationLabel = relation === 'support' ? '支持证据' : relation === 'conflict' ? '冲突证据' : relation === 'unrelated' ? '无关材料' : '定位提示 · 待判断';
          return <article key={item.id}><header><span>{relationLabel}</span><strong>{item.title}</strong></header><small className="source-index">记录 {String(index + 1).padStart(2, '0')} · {item.kind}</small><blockquote>{item.excerpt}</blockquote>{item.reason && <p className="source-reason">{item.reason}</p>}{reviewableEvidenceIds.has(item.id) && onReviewEvidenceRelation && <div className="relation-review-actions"><button type="button" onClick={() => onReviewEvidenceRelation(item.id, 'support')}>确认支持</button><button type="button" onClick={() => onReviewEvidenceRelation(item.id, 'conflict')}>标记冲突</button></div>}<footer>{item.source} · {item.reviewedByHuman ? '人工已核对' : relation === 'unreviewed' ? '待核对，不计分' : `模型关系估计 ${Math.round(item.confidence * 100)}%`}</footer></article>;
        })}
      </div>
      <div className="repair-box"><span>建议修复</span><p>{claim.repair}</p></div>
      {notice && <div className="evidence-found" role="status"><strong>{notice.title}</strong><p>{notice.text}</p></div>}
      {claim.id === 'claim-energy' ? <button className="repair-action" type="button" onClick={onRepair} disabled={repaired}>{repaired ? '30 天对照实验已入链' : '补充 30 天对照实验'}</button> : <>
        <input ref={inputRef} className="visually-hidden" aria-label="按建议上传证据文件" type="file" accept=".pdf,.md,.txt,.csv,.json,.png,.jpg,.jpeg,.webp" multiple onChange={(event) => { void upload(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
        <small className="evidence-upload-note">图片和扫描 PDF 会自动使用 TextIn OCR，再进入证据核验。</small>
        <button className="repair-action" type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>{uploading ? `正在逐份核验 ${uploadCount} 份材料…` : '上传材料并智能排序（最多 5 份）'}</button>
        {sources.some((item) => confirmableEvidenceIds.has(item.id)) && claim.status !== 'verified' && <button className="confirm-evidence-action" type="button" onClick={onConfirmEvidence}>确认关系并完成审阅</button>}
      </>}
    </section>
  );
}
