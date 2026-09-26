import { render, screen, within } from '@testing-library/react';
import { demoProject } from '../../data/demoProject';
import { EvidenceGraph } from './EvidenceGraph';
import userEvent from '@testing-library/user-event';

it('presents a readable claim-to-evidence relationship without an oversized canvas', () => {
  const claim = demoProject.claims[0];
  render(<EvidenceGraph claim={claim} evidence={demoProject.evidence} />);

  const board = screen.getByRole('figure', { name: `${claim.statement} 与 2 条证据的关系图` });
  expect(within(board).getByText(claim.statement)).toBeVisible();
  expect(within(board).getByText('项目研究报告 v3')).toBeVisible();
  expect(within(board).getByText('研究报告.pdf · P12')).toBeVisible();
  expect(within(board).getByText('91%')).toBeVisible();
  expect(board.querySelector('svg')).not.toBeInTheDocument();
});

it('shows an explicit gap when a claim has no linked evidence', () => {
  const claim = { ...demoProject.claims[0], evidenceIds: [] };
  render(<EvidenceGraph claim={claim} evidence={demoProject.evidence} />);
  expect(screen.getByText('这里还缺证据')).toBeVisible();
});

it('changes the relationship cards when the selected claim changes', () => {
  const { rerender } = render(<EvidenceGraph claim={demoProject.claims[0]} evidence={demoProject.evidence} />);
  expect(screen.getByText('项目研究报告 v3')).toBeVisible();
  rerender(<EvidenceGraph claim={demoProject.claims[1]} evidence={demoProject.evidence} />);
  expect(screen.queryByText('项目研究报告 v3')).not.toBeInTheDocument();
  expect(screen.getByText('离线评估表')).toBeVisible();
});

it('keeps five linked evidence items quiet until the user expands them', async () => {
  const evidence = Array.from({ length: 5 }, (_, index) => ({
    id: `e-${index}`, title: `证据 ${index + 1}`, kind: 'document' as const,
    excerpt: `第 ${index + 1} 条很长的证据原文，${'用于验证展开行为。'.repeat(20)}`,
    source: `材料-${index + 1}.pdf`, confidence: .8, relation: 'support' as const,
  }));
  const claim = { ...demoProject.claims[0], evidenceIds: evidence.map((item) => item.id) };
  render(<EvidenceGraph claim={claim} evidence={evidence} />);

  expect(document.querySelectorAll('.evidence-card')).toHaveLength(4);
  await userEvent.click(screen.getByRole('button', { name: '显示其余 1 条证据' }));
  expect(document.querySelectorAll('.evidence-card')).toHaveLength(5);
  expect(screen.queryByText(evidence[0].excerpt)).not.toBeInTheDocument();
  await userEvent.click(screen.getAllByRole('button', { name: '展开完整原文' })[0]);
  expect(screen.getByText(evidence[0].excerpt)).toBeVisible();
});
