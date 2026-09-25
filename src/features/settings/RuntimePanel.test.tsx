import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RuntimePanel } from './RuntimePanel';

it('states demo limitations without presenting a fake live call', () => {
  render(<RuntimePanel text="测试材料" isDemo />);
  expect(screen.getByText('演示模式')).toBeVisible();
  expect(screen.getByRole('button', { name: '检测并分析当前材料' })).toBeVisible();
  expect(screen.getByText('Qwen3-4B INT4')).toBeVisible();
  expect(screen.getByRole('heading', { name: '本地分析仪' })).toBeVisible();
  expect(screen.getByRole('heading', { name: '云端复核仪' })).toBeVisible();
});

it('shows the actual local inference device returned by OpenVINO', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    json: async () => ({ state: 'service_ready', model_state: 'ready', device: 'GPU.0', device_name: 'NVIDIA GeForce RTX 3050 Laptop GPU' }),
  })));
  render(<RuntimePanel text="测试材料" />);
  expect(await screen.findByText(/GPU\.0 · NVIDIA GeForce RTX 3050 Laptop GPU/)).toBeVisible();
  vi.unstubAllGlobals();
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

it('keeps a long local result on a human review slip', async () => {
  const summary = '端侧分析结果'.repeat(60);
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    json: async () => url.includes('local/status')
      ? { state: 'service_ready', model_state: 'ready' }
      : { state: 'service_ready', result: { summary } },
  })));
  render(<RuntimePanel text="测试材料" />);

  await userEvent.click(screen.getByRole('button', { name: '使用端侧模型分析' }));

  const slip = await screen.findByTestId('human-review-slip');
  expect(slip).toHaveTextContent('待人工确认');
  expect(slip).toHaveTextContent(summary);
  vi.unstubAllGlobals();
});

it('lets a reviewer add a local model finding to the evidence dossier', async () => {
  const accept = vi.fn();
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    json: async () => url.includes('local/status')
      ? { state: 'service_ready', model_state: 'ready' }
      : { state: 'service_ready', result: { summary: '主张缺少同周期对照证据' } },
  })));
  render(<RuntimePanel text="测试材料" onAcceptLocalInsight={accept} />);
  await userEvent.click(screen.getByRole('button', { name: '使用端侧模型分析' }));
  await userEvent.click(await screen.findByRole('button', { name: '确认并加入档案' }));
  expect(accept).toHaveBeenCalledWith('主张缺少同周期对照证据');
  expect(screen.getByRole('button', { name: '已加入档案' })).toBeDisabled();
  vi.unstubAllGlobals();
});
