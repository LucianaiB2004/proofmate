import { render, screen, within } from '@testing-library/react';
import { demoProject } from '../../data/demoProject';
import { EvidenceGraph } from './EvidenceGraph';

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
