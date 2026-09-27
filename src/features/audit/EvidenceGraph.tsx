import { useEffect, useState } from 'react';
import type { Claim, EvidenceItem } from '../../domain/types';

const kindLabel: Record<EvidenceItem['kind'], string> = {
  document: '文档', code: '代码', data: '数据', image: '图片', log: '日志',
};

export function EvidenceGraph({ claim, evidence, claimPosition, claimCount }: { claim: Claim; evidence: EvidenceItem[]; claimPosition?: number; claimCount?: number }) {
  const [showAll, setShowAll] = useState(false);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const relationRank = { support: 0, conflict: 1, unreviewed: 2, unrelated: 3 };
  const linked = evidence
    .filter((item) => claim.evidenceIds.includes(item.id))
    .slice()
    .sort((left, right) => relationRank[left.relation ?? 'support'] - relationRank[right.relation ?? 'support'] || right.confidence - left.confidence);
  const label = `${claim.statement} 与 ${linked.length} 条证据的关系图`;
  const visible = showAll ? linked : linked.slice(0, 4);
  useEffect(() => { setShowAll(false); setExpandedIds([]); }, [claim.id]);
  return (
    <section className="graph-panel" aria-labelledby="graph-title">
      <div className="panel-heading"><div><p className="section-kicker">EVIDENCE MAP / PINBOARD</p><h2 id="graph-title">证据关系板</h2></div><span>{claimPosition && claimCount ? `第 ${claimPosition}/${claimCount} 条主张 · ` : ''}{linked.length} 条关系线索</span></div>
      <figure className="evidence-board" aria-label={label}>
        <article className="claim-card"><span>核心主张</span><strong>{claim.statement}</strong><small>{claim.status === 'verified' ? '证据闭环' : claim.status === 'conflict' ? '存在冲突' : '等待补证'}</small></article>
        <div className={`relation-rail${linked.some((item) => (item.relation ?? 'support') === 'support') ? '' : ' is-pending'}`} aria-hidden="true"><span /></div>
        <div className="evidence-card-list">
          {linked.length === 0 ? <article className="evidence-gap"><span>＋</span><div><strong>这里还缺证据</strong><p>补充可追溯材料后，关系会出现在这里。</p></div></article> : visible.map((item, index) => {
            const relation = item.relation ?? (claim.status === 'conflict' && index === 1 ? 'conflict' : 'support');
            const relationLabel = { support: '支持', conflict: '冲突', unrelated: '无关', unreviewed: '待判断' }[relation];
            const expanded = expandedIds.includes(item.id);
            const long = item.excerpt.length > 120;
            return <article className={`evidence-card relation-${relation}`} key={item.id}>
              <div className="evidence-card-top"><span>{kindLabel[item.kind]}</span><b>{relationLabel}</b></div>
              <strong>{item.title}</strong><p>{expanded || !long ? item.excerpt : `${item.excerpt.slice(0, 120)}…`}</p>
              {long && <button className="evidence-expand" type="button" aria-expanded={expanded} onClick={() => setExpandedIds((ids) => expanded ? ids.filter((id) => id !== item.id) : [...ids, item.id])}>{expanded ? '收起完整原文' : '展开完整原文'}</button>}
              {item.reason && <p className="evidence-reason">{item.reason}</p>}
              <footer><span>{item.source}</span><em>{item.reviewedByHuman ? '人工已核对' : relation === 'unreviewed' ? '不计分' : `模型估计 ${Math.round(item.confidence * 100)}%`}</em></footer>
            </article>;
          })}
          {linked.length > 4 && <button className="show-more-evidence" type="button" onClick={() => setShowAll((value) => !value)}>{showAll ? '收起其余证据' : `显示其余 ${linked.length - 4} 条证据`}</button>}
        </div>
      </figure>
      <p className="graph-legend"><span className="support-dot" />支持证据 <span className="conflict-dot" />冲突证据 <span className="pending-dot" />待判断线索</p>
    </section>
  );
}
