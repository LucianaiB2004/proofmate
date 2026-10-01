import { useCallback, useRef, useState } from 'react';
import type { ProjectAudit } from './domain/types';
import { FileDropzone } from './features/onboarding/FileDropzone';
import { ScanSequence } from './features/onboarding/ScanSequence';
import { AuditDashboard } from './features/audit/AuditDashboard';
import { demoCases } from './data/demoCases';
import { CaseGallery } from './features/cases/CaseGallery';
import { clearAuditDraft, loadAuditDraft } from './features/persistence/auditDraft';
import { ProviderSettings } from './features/settings/ProviderSettings';

export function App({ publicDemo = import.meta.env.VITE_PUBLIC_DEMO === 'true' }: { publicDemo?: boolean }) {
  const [view, setView] = useState<'landing' | 'cases' | 'scan' | 'ready'>('landing');
  const [audit, setAudit] = useState<ProjectAudit | null>(null);
  const [files, setFiles] = useState<File[] | null>(null);
  const [selectedDemo, setSelectedDemo] = useState(demoCases[0].project);
  const [savedAudit, setSavedAudit] = useState(loadAuditDraft);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const materialInputRef = useRef<HTMLInputElement>(null);
  const finishScan = useCallback((result: ProjectAudit) => {
    setAudit(result);
    setView('ready');
  }, []);
  const startPrimaryExperience = () => {
    if (publicDemo) {
      setFiles(null);
      setView('scan');
      return;
    }
    materialInputRef.current?.click();
  };

  let content;
  if (view === 'scan') content = <ScanSequence files={files} demoProject={selectedDemo} onComplete={finishScan} />;
  else if (view === 'ready' && audit) content = <AuditDashboard initialAudit={audit} sourceFiles={files ?? undefined} publicDemo={publicDemo} />;
  else if (view === 'cases') content = <CaseGallery cases={demoCases} onBack={() => setView('landing')} onSelect={(item) => { setFiles(null); setSelectedDemo(item.project); setView('scan'); }} />;
  else content = (
    <main className="landing-shell">
      <section className="archive-cover" aria-labelledby="hero-title">
        <div className="archive-intro">
          <div className="archive-meta" aria-label="作品档案信息">
            <span>档案编号 TM-AI-2026 / PM-001</span><span><time dateTime="2026-09">2026.09</time> · <strong>作者 LucianaiB</strong></span>
          </div>
          <p className="eyebrow">TextIn xParse × Qwen × OpenVINO × 天猫 AI</p>
          {publicDemo && <p className="public-demo-banner">GitHub Pages 公开体验版</p>}
          <h1 id="hero-title">每个结论，都能找到它的证据。</h1>
          <p className="plain-promise">你把答辩材料给我，我帮你找出里面站不住脚的结论和缺少的证据。</p>
          <p className="hero-copy">把论文、代码、数据和截图整理成可追溯的证据档案。AI 发现关系，人审阅并盖章确认。</p>
          <div className="hero-actions">
            <button type="button" onClick={startPrimaryExperience}>{publicDemo ? '体验公开案例' : '开始审查我的材料'}</button>
            <button className="secondary-action" type="button" onClick={() => setView('cases')}>查看案例展示</button>
            {savedAudit && <><button className="resume-action" type="button" onClick={() => { setAudit(savedAudit); setView('ready'); }}>继续上次档案</button><button className="secondary-action" type="button" onClick={() => { if (clearAuditDraft()) setSavedAudit(null); }}>清除本机档案</button></>}
            <span>无需登录 · 可直接审阅 · 结果不替代人工判断</span>
            <small>自动保存会在此浏览器保留提取正文与分析结果，不保存原文件；可随时清除。</small>
          </div>
        </div>
        <aside className="archive-intake" aria-labelledby="intake-title">
          <span className="paperclip" aria-hidden="true" />
          <p className="folder-tab">{publicDemo ? 'PUBLIC CASE / SAFE MODE' : 'RESEARCH MATERIAL / 01'}</p>
          <h2 id="intake-title">{publicDemo ? '公开案例体验' : '材料投递口'}</h2>
          <p>{publicDemo ? '直接体验主张定位、证据关系、补证与人工确认。公开站点不接收密钥，也不上传本地模型。' : '把答辩材料装进这只档案袋，我们会先清点，再查隐私，最后核验证据关系。'}</p>
          {publicDemo ? <button className="public-demo-start" type="button" onClick={() => { setFiles(null); setView('scan'); }}>打开默认案例</button> : <FileDropzone inputRef={materialInputRef} onFilesAccepted={(accepted) => { setFiles(accepted); setView('scan'); }} />}
          <dl className="intake-notes">
            <div><dt>{publicDemo ? '体验' : '支持'}</dt><dd>{publicDemo ? '公开案例与完整证据闭环' : 'PDF / MD / TXT / CSV / JSON / 图片'}</dd></div>
            <div><dt>{publicDemo ? '实时模型' : '处理'}</dt><dd>{publicDemo ? '请在本地完整版中运行' : '优先在浏览器与端侧完成'}</dd></div>
          </dl>
        </aside>
      </section>
    </main>
  );
  return <>{content}<button className="settings-launch" type="button" onClick={() => setSettingsOpen(true)}>{publicDemo ? '公开版说明' : '模型与 OCR 设置'}</button>{settingsOpen && <ProviderSettings onClose={() => setSettingsOpen(false)} publicDemo={publicDemo} />}</>;
}
