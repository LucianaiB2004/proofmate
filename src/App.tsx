import { useCallback, useState } from 'react';
import type { ProjectAudit } from './domain/types';
import { FileDropzone } from './features/onboarding/FileDropzone';
import { ScanSequence } from './features/onboarding/ScanSequence';
import { AuditDashboard } from './features/audit/AuditDashboard';

export function App() {
  const [view, setView] = useState<'landing' | 'scan' | 'ready'>('landing');
  const [audit, setAudit] = useState<ProjectAudit | null>(null);
  const finishScan = useCallback((result: ProjectAudit) => {
    setAudit(result);
    setView('ready');
  }, []);

  if (view === 'scan') return <ScanSequence onComplete={finishScan} />;

  if (view === 'ready' && audit) {
    return <AuditDashboard initialAudit={audit} />;
  }

  return (
    <main className="landing-shell">
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">天猫 AI 黑客松作品 · Qwen × OpenVINO</p>
        <p className="brand">真源 <span>ProofMate</span></p>
        <h1 id="hero-title">每个结论，都能找到它的证据。</h1>
        <p className="hero-copy">
          把论文、代码、数据和截图变成一张可追溯的证据图谱，提前发现答辩里的每一个薄弱环节。
        </p>
        <div className="hero-actions">
          <button type="button" onClick={() => setView('scan')}>体验示例项目</button>
          <span>无需登录 · 无需 API Key · 90 秒看懂</span>
        </div>
        <FileDropzone onFilesAccepted={() => setView('scan')} />
      </section>
    </main>
  );
}
