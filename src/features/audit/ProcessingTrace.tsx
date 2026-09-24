import type { ProcessingTraceItem } from '../../domain/types';

export function ProcessingTrace({ items }: { items: ProcessingTraceItem[] }) {
  return (
    <section className="trace-panel" aria-labelledby="trace-title">
      <div className="panel-heading"><div><p className="section-kicker">PROCESS TRACE</p><h2 id="trace-title">本次处理轨迹</h2></div><span>可验证</span></div>
      <ol>{items.map((item, index) => <li key={`${item.label}-${index}`}><span className={`trace-mode ${item.stage}`}>{item.stage === 'device' ? '端侧' : '云端'}</span><div><strong>{item.label}</strong><p>{item.detail}</p></div></li>)}</ol>
    </section>
  );
}
