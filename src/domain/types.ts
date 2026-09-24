export type ClaimStatus = 'verified' | 'weak' | 'conflict' | 'missing';
export type EvidenceKind = 'document' | 'code' | 'data' | 'image' | 'log';

export interface EvidenceItem {
  id: string;
  title: string;
  kind: EvidenceKind;
  excerpt: string;
  source: string;
  confidence: number;
}

export interface Claim {
  id: string;
  statement: string;
  status: ClaimStatus;
  importance: 'critical' | 'high' | 'medium';
  evidenceIds: string[];
  risk: string;
  repair: string;
}

export interface AuditDimensions {
  coverage: number;
  consistency: number;
  freshness: number;
  reproducibility: number;
}

export interface ProcessingTraceItem {
  stage: 'device' | 'cloud';
  label: string;
  detail: string;
}

export interface ProjectAudit {
  id: string;
  name: string;
  score: number;
  dimensions: AuditDimensions;
  claims: Claim[];
  evidence: EvidenceItem[];
  trace: ProcessingTraceItem[];
}
