import type { Claim, ClaimStatus } from '../../domain/types';

const statusLabel: Record<ClaimStatus, string> = {
  verified: '已证实', weak: '待补证', conflict: '有冲突', missing: '缺证据',
};

export function ClaimList({ claims, selectedId, onSelect }: { claims: Claim[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <section className="claim-panel" aria-labelledby="claims-title">
      <div className="panel-heading"><div><p className="section-kicker">CLAIM REGISTER</p><h2 id="claims-title">关键主张</h2></div><span>{claims.length} 条</span></div>
      <div className="claim-list">
        {claims.map((claim, index) => (
          <button key={claim.id} type="button" className={`claim-item status-${claim.status} ${selectedId === claim.id ? 'is-selected' : ''}`} onClick={() => onSelect(claim.id)} aria-pressed={selectedId === claim.id}>
            <span className="claim-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="claim-statement">{claim.statement}</span>
            <span className="status-chip">{statusLabel[claim.status]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
