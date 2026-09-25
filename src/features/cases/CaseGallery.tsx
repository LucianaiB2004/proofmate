import type { DemoCase } from '../../data/demoCases';

interface CaseGalleryProps {
  cases: DemoCase[];
  onBack: () => void;
  onSelect: (item: DemoCase) => void;
}

export function CaseGallery({ cases, onBack, onSelect }: CaseGalleryProps) {
  return (
    <main className="case-page">
      <header className="case-page-header">
        <button className="case-back" type="button" aria-label="返回首页" onClick={onBack}>← 返回首页</button>
        <div>
          <p className="eyebrow">PUBLIC CASE FILES / {String(cases.length).padStart(2, '0')}</p>
          <h1>公开案例展示</h1>
          <p>不是摆一排概念，而是把公开资料里的结论、证据和断点拆给你看。</p>
        </div>
        <span className="case-page-note">公开案例为教学改编<br />不代表来源机构原始结论</span>
      </header>

      <section className="case-grid" aria-label="公开案例列表">
        {cases.map((item, index) => (
          <article className="case-card" key={item.id}>
            <figure className="case-visual">
              <img src={item.image} alt={item.imageAlt} />
              <figcaption>{item.imageCaption}</figcaption>
            </figure>
            <div className="case-card-body">
              <div className="case-card-meta"><span>0{index + 1}</span><small>{item.provenance}</small></div>
              <h2>{item.shortName}</h2>
              <p>{item.focus}</p>
              <div className="case-card-actions">
                <button type="button" onClick={() => onSelect(item)}>打开 {item.shortName}</button>
                <a className="case-source-link" href={item.sourceUrl} target="_blank" rel="noopener noreferrer"><span>打开原始资料 ↗</span><small>{item.sourceLabel}</small></a>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
