import { render, screen } from '@testing-library/react';
import { RuntimePanel } from './RuntimePanel';

it('states demo limitations without presenting a fake live call', () => {
  render(<RuntimePanel />);
  expect(screen.getByText('演示模式')).toBeVisible();
  expect(screen.getByText(/尚未连接实时模型/)).toBeVisible();
  expect(screen.getByText('Qwen3-4B INT4')).toBeVisible();
});
