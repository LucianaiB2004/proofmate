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
  const isDemo = !audit.id.startsWith('import-');
  const archiveNumber = `PM-${audit.id.replace(/[^a-z0-9]/gi, '').slice(0, 10).toUpperCase() || 'UNTITLED'}`;
  const repair = () => {
    setAudit((current) => linkEvidence(current, 'claim-energy', demoEvidence));
    setSelectedId('claim-energy');
  };
  const acceptLocalInsight = (summary: string) => {
    const id = 'claim-openvino-review';
    setAudit((current) => current.claims.some((claim) => claim.id === id) ? current : {
      ...current,
      claims: [...current.claims, {
        id,
        statement: summary,
        status: 'missing',
        importance: 'high',
        evidenceIds: [],
        risk: '这是端侧模型发现的待核验问题，尚缺少人工确认的来源证据。',
        repair: '回到原始材料定位对应段落，并补充可追溯来源后再确认。',
      }],
      trace: [...current.trace, { stage: 'device', label: 'OpenVINO 本地初审', detail: '端侧发现已由人工确认并加入待核验档案。' }],
    });
    setSelectedId(id);
  };

  return (
    <main className="cockpit">
      <header className="cockpit-header">
        <div><p className="eyebrow">真源 PROOFMATE · 项目卷宗</p><h1>{audit.name}</h1><p className="dossier-number">档案编号 {archiveNumber} · 审阅日期 2026.09</p></div>
        <div className="header-actions"><button type="button" onClick={() => downloadMarkdownReport(audit)}>导出答辩摘要</button><div className="runtime-badge"><span />{isDemo ? '演示模式' : '真实材料 · 本地抽取'}</div></div>
      </header>
      <nav className="risk-summary" aria-label="主张状态汇总">
        <span className="verified">{counts.verified} 已证实</span><span className="weak">{counts.weak} 待补证</span><span className="conflict">{counts.conflict} 有冲突</span><span className="missing">{counts.missing} 缺证据</span>
      </nav>
      <ScoreRing score={audit.score} dimensions={audit.dimensions} />
      {repaired && <div className="audit-stamp is-new" role="status"><span>证据闭环</span><small>HUMAN REVIEWED</small></div>}
      <div className="cockpit-grid">
        <ClaimList claims={audit.claims} selectedId={selected.id} onSelect={setSelectedId} />
        <EvidenceGraph claim={selected} evidence={audit.evidence} />
        <RiskInspector claim={selected} evidence={audit.evidence} repaired={repaired} onRepair={repair} />
      </div>
      <ProcessingTrace items={audit.trace} />
      <RuntimePanel isDemo={isDemo} text={audit.evidence.map((item) => `${item.source}: ${item.excerpt}`).join('\n').slice(0, 12000)} onAcceptLocalInsight={acceptLocalInsight} />
    </main>
  );
}
