import { useEffect, useMemo, useState } from 'react';
import { demoEvidence } from '../../data/demoProject';
import { getRiskCounts, linkEvidence, recalculateAudit } from '../../domain/audit';
import type { EvidenceItem, ProjectAudit } from '../../domain/types';
import { ClaimList } from './ClaimList';
import { EvidenceGraph } from './EvidenceGraph';
import { ProcessingTrace } from './ProcessingTrace';
import { RiskInspector } from './RiskInspector';
import { ScoreRing } from './ScoreRing';
import { RuntimePanel } from '../settings/RuntimePanel';
import { downloadMarkdownReport } from '../export/buildReport';
import type { QwenClaim } from '../../../server/qwenClient';
import { defaultExtractionMethod, ExtractionFailure, extractFile, sourceFileFingerprint, type ExtractedFile } from '../onboarding/extractFileText';
import { parseLocalReviews } from './parseLocalReview';
import { saveAuditDraft } from '../persistence/auditDraft';
import { SourceMaterialPanel } from './SourceMaterialPanel';
import { mergeReviewRound, type ReviewDelta, type ReviewFinding } from '../../domain/reviewMerge';

export function AuditDashboard({ initialAudit, sourceFiles }: { initialAudit: ProjectAudit; sourceFiles?: File[] }) {
  const [audit, setAudit] = useState(() => recalculateAudit(initialAudit));
  const [availableSourceFiles, setAvailableSourceFiles] = useState<File[]>(sourceFiles ?? []);
  const [selectedId, setSelectedId] = useState(initialAudit.claims[0]?.id ?? '');
  const [evidenceNotice, setEvidenceNotice] = useState<{ claimId: string; title: string; text: string }>();
  const counts = getRiskCounts(audit);
  const selected = useMemo(() => audit.claims.find((item) => item.id === selectedId) ?? audit.claims[0], [audit, selectedId]);
  const repaired = audit.evidence.some((item) => item.id === demoEvidence.id);
  const isDemo = !audit.id.startsWith('import-');
  const archiveNumber = `PM-${audit.id.replace(/[^a-z0-9]/gi, '').slice(0, 10).toUpperCase() || 'UNTITLED'}`;
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSaved(saveAuditDraft(audit));
  }, [audit]);
  const repair = () => {
    setAudit((current) => linkEvidence(current, 'claim-energy', demoEvidence));
    setSelectedId('claim-energy');
  };
  const acceptLocalInsight = (summary: string): ReviewDelta => {
    const reviews = parseLocalReviews(summary);
    const findings: ReviewFinding[] = reviews.map((review) => ({ statement: review.statement, excerpt: review.basis, source: 'OpenVINO 分析结果 · 待回原材料定位', risk: review.risk, repair: review.repair, relation: 'unreviewed', confidence: review.basis ? 0.45 : 0.2 }));
    const result = mergeReviewRound(audit, findings, { origin: 'openvino', revision: audit.trace.length + 1 });
    const next = recalculateAudit({ ...result.audit, trace: [...result.audit.trace, { stage: 'device', label: 'OpenVINO 端侧初审', detail: `本轮新增 ${result.delta.added}、更新 ${result.delta.updated}、合并 ${result.delta.merged}；剩余 ${result.delta.remaining} 条待复核。定位提示不冒充来源证据。` }] });
    setAudit(next);
    if (result.delta.changedClaimIds[0]) setSelectedId(result.delta.changedClaimIds[0]);
    return result.delta;
  };
  const uploadEvidence = async (files: File[]) => {
    if (!selected) return;
    const batch = Date.now().toString(36);
    const assessed: Array<{ file: File; assessment: Required<Pick<EvidenceItem, 'relation' | 'excerpt' | 'reason' | 'confidence'>>; id: string; extracted: ExtractedFile }> = [];
    for (const [index, file] of files.slice(0, 5).entries()) {
      let extracted: ExtractedFile;
      let extractionError = '';
      try { extracted = await extractFile(file); }
      catch (error) {
        extractionError = error instanceof Error ? error.message : '未知解析错误';
        extracted = { text: '', method: error instanceof ExtractionFailure ? error.method : defaultExtractionMethod(file) };
      }
      const text = extracted.text.replace(/\s+/g, ' ').trim();
      let assessment: { relation: 'support' | 'conflict' | 'unrelated' | 'unreviewed'; excerpt: string; reason: string; confidence: number };
      if (!text) {
        assessment = { relation: 'unreviewed', excerpt: extractionError ? `解析失败：${extractionError}` : '未读取到可核对正文', reason: extractionError ? '材料已保留在档案中，但解析未完成。请检查 OCR 设置或稍后重试。' : '请改用支持的 PDF、Markdown、TXT、CSV、JSON 或图片文件。', confidence: 0 };
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
      assessed.push({ file, assessment: { ...assessment, excerpt: assessment.excerpt || text.slice(0, 260) }, id: `evidence-upload-${batch}-${index}`, extracted });
    }
    const counts = assessed.reduce((result, item) => ({ ...result, [item.assessment.relation]: result[item.assessment.relation] + 1 }), { support: 0, conflict: 0, unrelated: 0, unreviewed: 0 });
    setAudit((current) => recalculateAudit({
      ...current,
      evidence: [...current.evidence, ...assessed.map(({ id, file, assessment, extracted }) => ({ id, title: file.name, kind: file.type.startsWith('image/') ? 'image' as const : 'document' as const, excerpt: assessment.excerpt, content: extracted.text.slice(0, 20000), extractionMethod: extracted.method, source: file.name, sourceFingerprint: sourceFileFingerprint(file), confidence: assessment.confidence, relation: assessment.relation, reason: assessment.reason }))],
      claims: current.claims.map((claim) => claim.id === selected.id ? { ...claim, status: counts.conflict ? 'conflict' : counts.support && claim.status !== 'verified' ? 'weak' : claim.status, evidenceIds: [...claim.evidenceIds, ...assessed.map((item) => item.id)] } : claim),
      trace: [...current.trace, { stage: 'device', label: assessed.length > 1 ? 'OpenVINO 批量证据核验' : 'OpenVINO 证据核验', detail: `${assessed.length} 份材料已逐份核验：${counts.support} 份支持、${counts.conflict} 份冲突、${counts.unrelated} 份无关、${counts.unreviewed} 份待判断。` }],
    }));
    setAvailableSourceFiles((current) => [...current, ...files.slice(0, 5)]);
    const summary = `${assessed.length} 份材料中：${counts.support} 份支持，${counts.conflict} 份冲突，${counts.unrelated} 份无关，${counts.unreviewed} 份待判断。`;
    const single = assessed[0]?.assessment;
    setEvidenceNotice({
      claimId: selected.id,
      title: assessed.length > 1 ? '批量核验完成' : counts.support ? '找到证据啦' : counts.conflict ? '发现冲突证据' : counts.unrelated ? '这份材料不相关' : '等待人工判断',
      text: assessed.length > 1 ? `${summary} 已按关系和可信度排序。` : single?.relation === 'unrelated' ? `${single.reason}，不能用于证明当前主张。` : `${single?.reason ?? ''}。已定位原文，请核对后处理关系。`,
    });
  };
  const confirmEvidence = () => {
    if (!selected) return;
    setAudit((current) => {
      return recalculateAudit({
        ...current,
        claims: current.claims.map((claim) => claim.id === selected.id ? { ...claim, status: 'verified', risk: '', repair: '证据关系已经人工核对，可在答辩材料中引用。' } : claim),
        trace: [...current.trace, { stage: 'device', label: '人工确认关系', detail: '审阅者已确认候选证据能够支持当前主张，证据闭环完成。' }],
      });
    });
    setEvidenceNotice({ claimId: selected.id, title: '证据闭环', text: '证据关系已由你确认，主张状态已更新为“已证实”。' });
  };
  const acceptQwenFindings = (findings: QwenClaim[]): ReviewDelta => {
    const result = mergeReviewRound(audit, findings.map((finding) => ({ ...finding, relation: 'support', confidence: 0.72 })), { origin: 'qwen', revision: audit.trace.length + 1 });
    const next = recalculateAudit({ ...result.audit, trace: [...result.audit.trace, { stage: 'cloud', label: 'Qwen 云端复核入档', detail: `本轮新增 ${result.delta.added}、更新 ${result.delta.updated}、合并 ${result.delta.merged}、解决 ${result.delta.resolved}；剩余 ${result.delta.remaining} 条待复核。` }] });
    setAudit(next);
    if (result.delta.changedClaimIds[0]) setSelectedId(result.delta.changedClaimIds[0]);
    return result.delta;
  };

  const unresolved = audit.claims.filter((claim) => claim.status !== 'verified');
  const localText = audit.evidence.map((item) => `${item.source}: ${item.content || item.excerpt}`).join('\n').slice(0, 12000);
  const cloudText = unresolved.map((claim) => {
    const sources = audit.evidence.filter((item) => claim.evidenceIds.includes(item.id));
    return `【待复核主张】${claim.statement}\n【当前风险】${claim.risk}\n【当前证据】${sources.map((item) => `${item.source}: ${item.excerpt}`).join('；') || '暂无'}`;
  }).join('\n\n').slice(0, 12000);

  return (
    <main className="cockpit">
      <header className="cockpit-header">
        <div><p className="eyebrow">真源 PROOFMATE · 项目卷宗</p><h1>{audit.name}</h1><p className="dossier-number">档案编号 {archiveNumber} · 审阅日期 2026.09</p></div>
        <div className="header-actions"><button type="button" onClick={() => downloadMarkdownReport(audit)}>导出答辩摘要</button>{saved && <div className="save-badge"><span aria-hidden="true">✓</span>已自动保存</div>}<div className="runtime-badge"><span />{isDemo ? '演示模式' : '真实材料 · 本地抽取'}</div></div>
      </header>
      <nav className="risk-summary" aria-label="主张状态汇总">
        <span className="verified">{counts.verified} 已证实</span><span className="weak">{counts.weak} 待补证</span><span className="conflict">{counts.conflict} 有冲突</span><span className="missing">{counts.missing} 缺证据</span>
      </nav>
      <ScoreRing score={audit.score} dimensions={audit.dimensions} />
      {repaired && <div className="audit-stamp is-new" role="status"><span>证据闭环</span><small>HUMAN REVIEWED</small></div>}
      <div className="cockpit-grid">
        <ClaimList claims={audit.claims} selectedId={selected?.id ?? ''} onSelect={setSelectedId} />
        {selected ? <><EvidenceGraph claim={selected} evidence={audit.evidence} /><RiskInspector claim={selected} evidence={audit.evidence} repaired={repaired} notice={evidenceNotice?.claimId === selected.id ? evidenceNotice : undefined} onRepair={repair} onEvidenceUpload={uploadEvidence} onConfirmEvidence={confirmEvidence} /></> : <section className="empty-review-state"><p className="section-kicker">MODEL REVIEW / WAITING</p><h2>尚未生成可核验主张</h2><p>文件提取不是模型分析。请先在下方运行 OpenVINO 端侧初审，确认候选后再使用 Qwen 复核未解决项。</p></section>}
      </div>
      <ProcessingTrace items={audit.trace} />
      <SourceMaterialPanel evidence={audit.evidence} sourceFiles={availableSourceFiles} onRelink={(files) => setAvailableSourceFiles((current) => [...current, ...files])} />
      <RuntimePanel isDemo={isDemo} text={localText} cloudText={cloudText} scopeCount={isDemo ? undefined : unresolved.length} onAcceptLocalInsight={acceptLocalInsight} onAcceptQwenFindings={acceptQwenFindings} />
    </main>
  );
}
