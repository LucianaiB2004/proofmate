import { useMemo, useState } from 'react';
import { demoEvidence } from '../../data/demoProject';
import { calculateAuditScore, getRiskCounts, linkEvidence } from '../../domain/audit';
import type { EvidenceItem, ProjectAudit } from '../../domain/types';
import { ClaimList } from './ClaimList';
import { EvidenceGraph } from './EvidenceGraph';
import { ProcessingTrace } from './ProcessingTrace';
import { RiskInspector } from './RiskInspector';
import { ScoreRing } from './ScoreRing';
import { RuntimePanel } from '../settings/RuntimePanel';
import { downloadMarkdownReport } from '../export/buildReport';
import type { QwenClaim } from '../../../server/qwenClient';
import { extractFileText } from '../onboarding/extractFileText';
import { parseLocalReviews } from './parseLocalReview';

export function AuditDashboard({ initialAudit }: { initialAudit: ProjectAudit }) {
  const [audit, setAudit] = useState(initialAudit);
  const [selectedId, setSelectedId] = useState('claim-energy');
  const [evidenceNotice, setEvidenceNotice] = useState<{ claimId: string; title: string; text: string }>();
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
    const reviews = parseLocalReviews(summary);
    const batch = Date.now().toString(36);
    const firstId = `claim-openvino-${batch}-0`;
    setAudit((current) => {
      const fresh = reviews.filter((review) => !current.claims.some((claim) => claim.statement === review.statement));
      if (!fresh.length) return current;
      return {
        ...current,
        claims: [...current.claims, ...fresh.map((review, index) => ({
          id: `claim-openvino-${batch}-${index}`,
          statement: review.statement,
          status: 'missing' as const,
          importance: 'high' as const,
          evidenceIds: [],
          risk: review.risk,
          repair: review.repair,
        }))],
        trace: [...current.trace, { stage: 'device', label: 'OpenVINO 本地初审', detail: `${fresh.length} 条端侧发现已拆分为独立主张并加入待核验档案。模型依据只作定位提示，不冒充来源证据。` }],
      };
    });
    setSelectedId(firstId);
  };
  const uploadEvidence = async (files: File[]) => {
    const batch = Date.now().toString(36);
    const assessed: Array<{ file: File; assessment: Required<Pick<EvidenceItem, 'relation' | 'excerpt' | 'reason' | 'confidence'>>; id: string }> = [];
    for (const [index, file] of files.slice(0, 5).entries()) {
      const text = (await extractFileText(file)).replace(/\s+/g, ' ').trim();
      let assessment: { relation: 'support' | 'conflict' | 'unrelated' | 'unreviewed'; excerpt: string; reason: string; confidence: number };
      if (!text) {
        assessment = { relation: 'unreviewed', excerpt: '未读取到可核对正文', reason: '请改用 PDF、Markdown、TXT、CSV 或 JSON 文件。', confidence: 0 };
      } else {
        try {
          const response = await fetch('/api/local/evidence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claim: selected.statement, evidence: text.slice(0, 12000), source: file.name }) });
          const payload = await response.json();
          if (!payload.result) throw new Error('missing assessment');
          assessment = payload.result;
        } catch {
          assessment = { relation: 'unreviewed', excerpt: text.slice(0, 260), reason: '端侧核验服务暂不可用，尚未判断这份材料与主张的关系。', confidence: 0 };
        }
      }
      assessed.push({ file, assessment, id: `evidence-upload-${batch}-${index}` });
    }
    const counts = assessed.reduce((result, item) => ({ ...result, [item.assessment.relation]: result[item.assessment.relation] + 1 }), { support: 0, conflict: 0, unrelated: 0, unreviewed: 0 });
    setAudit((current) => ({
      ...current,
      evidence: [...current.evidence, ...assessed.map(({ id, file, assessment }) => ({ id, title: file.name, kind: 'document' as const, excerpt: assessment.excerpt, source: file.name, confidence: assessment.confidence, relation: assessment.relation, reason: assessment.reason }))],
      claims: current.claims.map((claim) => claim.id === selected.id ? { ...claim, status: counts.conflict ? 'conflict' : counts.support && claim.status !== 'verified' ? 'weak' : claim.status, evidenceIds: [...claim.evidenceIds, ...assessed.map((item) => item.id)] } : claim),
      trace: [...current.trace, { stage: 'device', label: assessed.length > 1 ? 'OpenVINO 批量证据核验' : 'OpenVINO 证据核验', detail: `${assessed.length} 份材料已逐份核验：${counts.support} 份支持、${counts.conflict} 份冲突、${counts.unrelated} 份无关、${counts.unreviewed} 份待判断。` }],
    }));
    const summary = `${assessed.length} 份材料中：${counts.support} 份支持，${counts.conflict} 份冲突，${counts.unrelated} 份无关，${counts.unreviewed} 份待判断。`;
    const single = assessed[0]?.assessment;
    setEvidenceNotice({
      claimId: selected.id,
      title: assessed.length > 1 ? '批量核验完成' : counts.support ? '找到证据啦' : counts.conflict ? '发现冲突证据' : counts.unrelated ? '这份材料不相关' : '等待人工判断',
      text: assessed.length > 1 ? `${summary} 已按关系和可信度排序。` : single?.relation === 'unrelated' ? `${single.reason}，不能用于证明当前主张。` : `${single?.reason ?? ''}。已定位原文，请核对后处理关系。`,
    });
  };
  const confirmEvidence = () => {
    setAudit((current) => {
      const dimensions = { ...current.dimensions, coverage: Math.min(100, current.dimensions.coverage + 8), reproducibility: Math.min(100, current.dimensions.reproducibility + 8) };
      return {
        ...current,
        dimensions,
        score: calculateAuditScore(dimensions),
        claims: current.claims.map((claim) => claim.id === selected.id ? { ...claim, status: 'verified', risk: '', repair: '证据关系已经人工核对，可在答辩材料中引用。' } : claim),
        trace: [...current.trace, { stage: 'device', label: '人工确认关系', detail: '审阅者已确认候选证据能够支持当前主张，证据闭环完成。' }],
      };
    });
    setEvidenceNotice({ claimId: selected.id, title: '证据闭环', text: '证据关系已由你确认，主张状态已更新为“已证实”。' });
  };
  const acceptQwenFindings = (findings: QwenClaim[]) => {
    const batch = Date.now().toString(36);
    const firstId = `claim-qwen-${batch}-0`;
    setAudit((current) => {
      const fresh = findings.filter((finding) => !current.claims.some((claim) => claim.statement === finding.statement));
      if (!fresh.length) return current;
      const addedEvidence = fresh.map((finding, index) => ({
        id: `evidence-qwen-${batch}-${index}`,
        title: `Qwen 定位片段 ${String(index + 1).padStart(2, '0')}`,
        kind: 'document' as const,
        excerpt: finding.excerpt,
        source: finding.source,
        confidence: 0.72,
        relation: 'support' as const,
      }));
      return {
        ...current,
        evidence: [...current.evidence, ...addedEvidence],
        claims: [...current.claims, ...fresh.map((finding, index) => ({
          id: `claim-qwen-${batch}-${index}`,
          statement: finding.statement,
          status: 'weak' as const,
          importance: 'high' as const,
          evidenceIds: [addedEvidence[index].id],
          risk: finding.risk,
          repair: finding.repair,
        }))],
        trace: [...current.trace, { stage: 'cloud' as const, label: 'Qwen 云端复核入档', detail: `${fresh.length} 条带来源发现已由人工确认并写入证据关系。` }],
      };
    });
    setSelectedId(firstId);
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
        <RiskInspector claim={selected} evidence={audit.evidence} repaired={repaired} notice={evidenceNotice?.claimId === selected.id ? evidenceNotice : undefined} onRepair={repair} onEvidenceUpload={uploadEvidence} onConfirmEvidence={confirmEvidence} />
      </div>
      <ProcessingTrace items={audit.trace} />
      <RuntimePanel isDemo={isDemo} text={audit.evidence.map((item) => `${item.source}: ${item.excerpt}`).join('\n').slice(0, 12000)} onAcceptLocalInsight={acceptLocalInsight} onAcceptQwenFindings={acceptQwenFindings} />
    </main>
  );
}
