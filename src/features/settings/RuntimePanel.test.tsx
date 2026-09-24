import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RuntimePanel } from './RuntimePanel';

it('states demo limitations without presenting a fake live call', () => {
  render(<RuntimePanel text="测试材料" isDemo />);
  expect(screen.getByText('演示模式')).toBeVisible();
  expect(screen.getByRole('button', { name: '检测并分析当前材料' })).toBeVisible();
  expect(screen.getByText('Qwen3-4B INT4')).toBeVisible();
});

it('shows structured Qwen output instead of discarding it', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    json: async () => url.includes('local/status')
      ? { state: 'service_unavailable' }
      : { state: 'provider_ready', claims: [{ statement: '试点节能 18%', risk: '周期过短' }] },
  })));
  render(<RuntimePanel text="测试材料" />);
  await userEvent.click(screen.getByRole('button', { name: '检测并分析当前材料' }));
  expect(await screen.findByText(/试点节能 18%｜风险：周期过短/)).toBeVisible();
  vi.unstubAllGlobals();
});
