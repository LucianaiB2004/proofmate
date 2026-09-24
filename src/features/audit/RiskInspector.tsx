import type { Claim, EvidenceItem } from '../../domain/types';

export function RiskInspector({ claim, evidence, repaired, onRepair }: { claim: Claim; evidence: EvidenceItem[]; repaired: boolean; onRepair: () => void }) {
  const sources = evidence.filter((item) => claim.evidenceIds.includes(item.id));
  return (
    <section className="risk-panel" role="region" aria-label="风险检查器">
      <p className="section-kicker">RISK INSPECTOR</p>
      <h2>{claim.status === 'verified' ? '证据闭环' : '为什么有风险？'}</h2>
      <p className="risk-copy">{claim.risk || '这条主张已经形成可追溯证据链。'}</p>
      <div className="source-stack">
        {sources.map((item) => <article key={item.id}><header><span>{item.kind}</span><strong>{item.title}</strong></header><blockquote>{item.excerpt}</blockquote><footer>{item.source} · 可信度 {Math.round(item.confidence * 100)}%</footer></article>)}
      </div>
      <div className="repair-box"><span>建议修复</span><p>{claim.repair}</p></div>
      <button className="repair-action" type="button" onClick={onRepair} disabled={repaired}>{repaired ? '30 天对照实验已入链' : '补充 30 天对照实验'}</button>
    </section>
  );
}
