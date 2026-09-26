export type ClaimStatus = 'verified' | 'weak' | 'conflict' | 'missing';
export type EvidenceKind = 'document' | 'code' | 'data' | 'image' | 'log';

export interface SourceFragment {
  id: string;
  evidenceId: string;
  source: string;
  locator: string;
  text: string;
  fingerprint: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  kind: EvidenceKind;
  excerpt: string;
  source: string;
  locator?: string;
  sourceFingerprint?: string;
  confidence: number;
  content?: string;
  extractionMethod?: 'browser-text' | 'pdfjs' | 'xparse-ocr' | 'none';
  relation?: 'support' | 'conflict' | 'unrelated' | 'unreviewed';
  reason?: string;
  fragments?: SourceFragment[];
  rawContent?: string;
}

export interface Claim {
  id: string;
  statement: string;
  status: ClaimStatus;
  importance: 'critical' | 'high' | 'medium';
  evidenceIds: string[];
  risk: string;
  repair: string;
  fingerprint?: string;
  origin?: 'openvino' | 'qwen' | 'human' | 'demo';
  reviewRevision?: number;
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
