import type { ProjectAudit } from '../../domain/types';

export const auditDraftKey = 'proofmate:last-audit';

export function saveAuditDraft(audit: ProjectAudit) {
  try {
    localStorage.setItem(auditDraftKey, JSON.stringify(audit));
    return true;
  } catch {
    return false;
  }
}

export function loadAuditDraft(): ProjectAudit | null {
  try {
    const value = localStorage.getItem(auditDraftKey);
    if (!value) return null;
    const audit = JSON.parse(value) as Partial<ProjectAudit>;
    if (typeof audit.id !== 'string' || typeof audit.name !== 'string' || typeof audit.score !== 'number' || !Array.isArray(audit.claims) || !Array.isArray(audit.evidence) || !Array.isArray(audit.trace) || !audit.dimensions) return null;
    return audit as ProjectAudit;
  } catch {
    return null;
  }
}
