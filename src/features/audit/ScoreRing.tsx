import type { AuditDimensions } from '../../domain/types';

const labels: Array<[keyof AuditDimensions, string]> = [
  ['coverage', '覆盖度'], ['consistency', '一致性'], ['freshness', '时间信息'], ['reproducibility', '复核完成度'],
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
      <details className="score-method">
        <summary>评分怎么算</summary>
        <p className="score-formula">35% × 覆盖度 {dimensions.coverage} + 25% × 一致性 {dimensions.consistency} + 15% × 时间信息 {dimensions.freshness} + 25% × 复核完成度 {dimensions.reproducibility} = {score} 分（四舍五入）</p>
        <p>逐条主张计分：核心主张权重 2，高重要度 1.5，普通主张 1。模型提示与无法回到原文的摘录不计分。</p>
        <ul>
          <li>覆盖度：支持原文能在原文件中找到，且关系已由人确认，才算覆盖。</li>
          <li>一致性：已有人工确认的支持且没有有效冲突，才算一致；没有支持证据时，一致性也记 0。</li>
          <li>时间信息：支持摘录或其所在段落写明可核对日期才计入，其他段落的日期不算。</li>
          <li>复核完成度：人工确认原文关系后计 50%；主张完成最终审阅后计 100%。</li>
        </ul>
        <p>四项均按主张重要度加权；这只是材料审查进度，不是作品质量或事实真伪的概率。</p>
      </details>
    </section>
  );
}
