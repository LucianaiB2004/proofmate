import type { Claim, EvidenceItem } from '../../domain/types';

const kindLabel: Record<EvidenceItem['kind'], string> = {
  document: '文档', code: '代码', data: '数据', image: '图片', log: '日志',
};

export function EvidenceGraph({ claim, evidence }: { claim: Claim; evidence: EvidenceItem[] }) {
  const linked = evidence.filter((item) => claim.evidenceIds.includes(item.id));
  const label = `${claim.statement} 与 ${linked.length} 条证据的关系图`;
  return (
    <section className="graph-panel" aria-labelledby="graph-title">
      <div className="panel-heading"><div><p className="section-kicker">EVIDENCE MAP / PINBOARD</p><h2 id="graph-title">证据关系板</h2></div><span>{linked.length} 条已关联</span></div>
      <figure className="evidence-board" aria-label={label}>
        <article className="claim-card"><span>核心主张</span><strong>{claim.statement}</strong><small>{claim.status === 'verified' ? '证据闭环' : claim.status === 'conflict' ? '存在冲突' : '等待补证'}</small></article>
        <div className="relation-rail" aria-hidden="true"><span /></div>
        <div className="evidence-card-list">
          {linked.length === 0 ? <article className="evidence-gap"><span>＋</span><div><strong>这里还缺证据</strong><p>补充可追溯材料后，关系会出现在这里。</p></div></article> : linked.map((item, index) => {
            const relation = item.relation ?? (claim.status === 'conflict' && index === 1 ? 'conflict' : 'support');
            const relationLabel = { support: '支持', conflict: '冲突', unrelated: '无关', unreviewed: '待判断' }[relation];
            return <article className={`evidence-card relation-${relation}`} key={item.id}>
              <div className="evidence-card-top"><span>{kindLabel[item.kind]}</span><b>{relationLabel}</b></div>
              <strong>{item.title}</strong><p>{item.excerpt}</p>
              {item.reason && <p className="evidence-reason">{item.reason}</p>}
              <footer><span>{item.source}</span><em>{Math.round(item.confidence * 100)}%</em></footer>
            </article>;
          })}
        </div>
      </figure>
      <p className="graph-legend"><span className="support-dot" />支持证据 <span className="conflict-dot" />冲突证据</p>
    </section>
  );
}
