import type { AuditDimensions } from '../../domain/types';

const labels: Array<[keyof AuditDimensions, string]> = [
  ['coverage', '覆盖度'], ['consistency', '一致性'], ['freshness', '时效性'], ['reproducibility', '可复现'],
];

export function ScoreRing({ score, dimensions }: { score: number; dimensions: AuditDimensions }) {
  return (
    <section className="score-card" aria-label={`证据健康度 ${score} 分`}>
      <div className="score-ring" role="img" aria-label={`证据审核章，健康度 ${score} 分`}>
        <div><span>证据审核</span><strong aria-live="polite">{score}</strong><small>/ 100</small></div>
      </div>
      <div className="score-copy">
        <p className="section-kicker">EVIDENCE HEALTH</p>
        <h2>证据健康度</h2>
        <p>每个分数都来自可追溯材料，而不是模型的主观印象。</p>
      </div>
      <dl className="dimension-grid">
        {labels.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{dimensions[key]}</dd><meter min="0" max="100" value={dimensions[key]} aria-label={`${label} ${dimensions[key]} 分`} /></div>)}
      </dl>
    </section>
  );
}
