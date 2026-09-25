import type { Claim, EvidenceItem } from '../../domain/types';

export function EvidenceGraph({ claim, evidence }: { claim: Claim; evidence: EvidenceItem[] }) {
  const linked = evidence.filter((item) => claim.evidenceIds.includes(item.id));
  return (
    <section className="graph-panel" aria-labelledby="graph-title">
      <div className="panel-heading"><div><p className="section-kicker">EVIDENCE MAP / PINBOARD</p><h2 id="graph-title">证据关系板</h2></div><span>支持关系</span></div>
      <div className="graph-scroll">
        <svg className="evidence-graph" viewBox="0 0 700 330" role="img" aria-label={`${claim.statement} 与 ${linked.length} 条证据的关系图`}>
          <defs><linearGradient id="nodeGlow"><stop stopColor="#d63b32"/><stop offset="1" stopColor="#8f211d"/></linearGradient></defs>
          {linked.map((item, index) => {
            const x = 475 + (index % 2) * 135;
            const y = 80 + Math.floor(index / 2) * 150;
            return <g key={item.id}>
              <line x1="310" y1="165" x2={x} y2={y} className={claim.status === 'conflict' && index === 1 ? 'edge-conflict' : 'edge-support'} />
              <rect x={x - 62} y={y - 30} width="124" height="60" rx="2" className="evidence-node" />
              <text x={x} y={y - 2} textAnchor="middle">{item.kind.toUpperCase()}</text>
              <text x={x} y={y + 14} textAnchor="middle" className="node-source">{item.source.split(' · ')[0].slice(0, 16)}</text>
            </g>;
          })}
          <circle cx="260" cy="165" r="82" fill="url(#nodeGlow)" />
          <text x="260" y="150" textAnchor="middle" className="claim-node-label">核心主张</text>
          <foreignObject x="190" y="162" width="140" height="55"><div className="claim-node-copy">{claim.statement}</div></foreignObject>
        </svg>
      </div>
      <p className="graph-legend"><span className="support-dot" />支持 <span className="conflict-dot" />冲突</p>
    </section>
  );
}
