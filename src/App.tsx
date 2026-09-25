import { useCallback, useState } from 'react';
import type { ProjectAudit } from './domain/types';
import { FileDropzone } from './features/onboarding/FileDropzone';
import { ScanSequence } from './features/onboarding/ScanSequence';
import { AuditDashboard } from './features/audit/AuditDashboard';
import { demoCases } from './data/demoCases';
import { CaseGallery } from './features/cases/CaseGallery';

export function App() {
  const [view, setView] = useState<'landing' | 'cases' | 'scan' | 'ready'>('landing');
  const [audit, setAudit] = useState<ProjectAudit | null>(null);
  const [files, setFiles] = useState<File[] | null>(null);
  const [selectedDemo, setSelectedDemo] = useState(demoCases[0].project);
  const finishScan = useCallback((result: ProjectAudit) => {
    setAudit(result);
    setView('ready');
  }, []);

  if (view === 'scan') return <ScanSequence files={files} demoProject={selectedDemo} onComplete={finishScan} />;

  if (view === 'ready' && audit) {
    return <AuditDashboard initialAudit={audit} />;
  }

  if (view === 'cases') {
    return <CaseGallery cases={demoCases} onBack={() => setView('landing')} onSelect={(item) => { setFiles(null); setSelectedDemo(item.project); setView('scan'); }} />;
  }

  return (
    <main className="landing-shell">
      <section className="archive-cover" aria-labelledby="hero-title">
        <div className="archive-intro">
          <div className="archive-meta" aria-label="作品档案信息">
            <span>档案编号 TM-AI-2026 / PM-001</span><span><time dateTime="2026-09">2026.09</time> · <strong>作者 LucianaiB</strong></span>
          </div>
          <p className="eyebrow">天猫 AI 黑客松作品 · Qwen × OpenVINO</p>
          <h1 id="hero-title">每个结论，都能找到它的证据。</h1>
          <p className="plain-promise">你把答辩材料给我，我帮你找出里面站不住脚的结论和缺少的证据。</p>
          <p className="hero-copy">把论文、代码、数据和截图整理成可追溯的证据档案。AI 发现关系，人审阅并盖章确认。</p>
          <div className="hero-actions">
            <button type="button" onClick={() => { setFiles(null); setSelectedDemo(demoCases[0].project); setView('scan'); }}>体验示例项目</button>
            <button className="secondary-action" type="button" onClick={() => setView('cases')}>查看案例展示</button>
            <span>无需登录 · 可直接审阅 · 结果不替代人工判断</span>
          </div>
        </div>
        <aside className="archive-intake" aria-labelledby="intake-title">
          <span className="paperclip" aria-hidden="true" />
          <p className="folder-tab">RESEARCH MATERIAL / 01</p>
          <h2 id="intake-title">材料投递口</h2>
          <p>把答辩材料装进这只档案袋，我们会先清点，再查隐私，最后核验证据关系。</p>
          <FileDropzone onFilesAccepted={(accepted) => { setFiles(accepted); setView('scan'); }} />
          <dl className="intake-notes">
            <div><dt>支持</dt><dd>PDF / MD / TXT / CSV / JSON / 图片</dd></div>
            <div><dt>处理</dt><dd>优先在浏览器与端侧完成</dd></div>
          </dl>
        </aside>
      </section>
    </main>
  );
}
