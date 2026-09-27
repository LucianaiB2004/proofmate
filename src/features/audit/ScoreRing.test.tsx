import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScoreRing } from './ScoreRing';

it('shows the exact weighted formula and explains why a model hint earns no points', async () => {
  render(<ScoreRing score={0} dimensions={{ coverage: 0, consistency: 0, freshness: 0, reproducibility: 0 }} />);
  await userEvent.click(screen.getByText('评分怎么算'));
  expect(screen.getByText(/35% × 覆盖度 0/)).toBeVisible();
  expect(screen.getByText(/模型提示与无法回到原文的摘录不计分/)).toBeVisible();
  expect(screen.getByText(/没有支持证据时，一致性也记 0/)).toBeVisible();
});
