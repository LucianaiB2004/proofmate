import { useMemo, useState } from 'react';
import { demoEvidence } from '../../data/demoProject';
import { getRiskCounts, linkEvidence } from '../../domain/audit';
import type { ProjectAudit } from '../../domain/types';
import { ClaimList } from './ClaimList';
import { EvidenceGraph } from './EvidenceGraph';
import { ProcessingTrace } from './ProcessingTrace';
import { RiskInspector } from './RiskInspector';
import { ScoreRing } from './ScoreRing';
import { RuntimePanel } from '../settings/RuntimePanel';
import { downloadMarkdownReport } from '../export/buildReport';

export function AuditDashboard({ initialAudit }: { initialAudit: ProjectAudit }) {
  const [audit, setAudit] = useState(initialAudit);
  const [selectedId, setSelectedId] = useState('claim-energy');
  const counts = getRiskCounts(audit);
  const selected = useMemo(() => audit.claims.find((item) => item.id === selectedId) ?? audit.claims[0], [audit, selectedId]);
  const repaired = audit.evidence.some((item) => item.id === demoEvidence.id);
  const repair = () => {
    setAudit((current) => linkEvidence(current, 'claim-energy', demoEvidence));
    setSelectedId('claim-energy');
  };

  return (
    <main className="cockpit">
      <header className="cockpit-header">
        <div><p className="eyebrow">真源 PROOFMATE · 证据驾驶舱</p><h1>{audit.name}</h1></div>
        <div className="header-actions"><button type="button" onClick={() => downloadMarkdownReport(audit)}>导出答辩摘要</button><div className="runtime-badge"><span />演示模式</div></div>
      </header>
      <nav className="risk-summary" aria-label="主张状态汇总">
        <span className="verified">{counts.verified} 已证实</span><span className="weak">{counts.weak} 待补证</span><span className="conflict">{counts.conflict} 有冲突</span><span className="missing">{counts.missing} 缺证据</span>
      </nav>
      <ScoreRing score={audit.score} dimensions={audit.dimensions} />
      <div className="cockpit-grid">
        <ClaimList claims={audit.claims} selectedId={selected.id} onSelect={setSelectedId} />
        <EvidenceGraph claim={selected} evidence={audit.evidence} />
        <RiskInspector claim={selected} evidence={audit.evidence} repaired={repaired} onRepair={repair} />
      </div>
      <ProcessingTrace items={audit.trace} />
      <RuntimePanel />
    </main>
  );
}
