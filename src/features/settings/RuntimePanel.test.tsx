import { render, screen } from '@testing-library/react';
import { RuntimePanel } from './RuntimePanel';

it('states demo limitations without presenting a fake live call', () => {
  render(<RuntimePanel text="测试材料" isDemo />);
  expect(screen.getByText('演示模式')).toBeVisible();
  expect(screen.getByRole('button', { name: '检测并分析当前材料' })).toBeVisible();
  expect(screen.getByText('Qwen3-4B INT4')).toBeVisible();
});
