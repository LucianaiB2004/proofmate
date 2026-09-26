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

it('explains the real-material model order without calling extraction model work', () => {
  render(<RuntimePanel text="已提取正文" scopeCount={0} />);
  expect(screen.getByText(/文件提取不是模型分析/)).toBeVisible();
  expect(screen.getByText(/OpenVINO 是第一遍模型初审/)).toBeVisible();
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
      : { state: 'provider_ready', claims: [{ statement: '试点节能 18%', risk: '周期过短', repair: '补充对照实验', source: 'report.pdf · P3', excerpt: '试点节能 18%' }] },
  })));
  render(<RuntimePanel text="测试材料" />);
  await userEvent.click(screen.getByRole('button', { name: '检测并分析当前材料' }));
  expect(await screen.findByText(/【结论】试点节能 18%/)).toBeVisible();
  expect(screen.getByText(/【依据】report.pdf · P3/)).toBeVisible();
  expect(screen.getByText(/【风险边界】周期过短/)).toBeVisible();
  expect(screen.getByText(/【下一步】补充对照实验/)).toBeVisible();
  vi.unstubAllGlobals();
});

it('shows an explicit cloud result when no traceable claims are returned', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    json: async () => url.includes('local/status')
      ? { state: 'service_unavailable' }
      : { state: 'provider_ready', claims: [] },
  })));
  render(<RuntimePanel text="测试材料" />);
  await userEvent.click(screen.getByRole('button', { name: '检测并分析当前材料' }));

  expect(await screen.findByTestId('human-review-slip')).toHaveTextContent('云端复核完成');
  expect(screen.getByTestId('human-review-slip')).toHaveTextContent('没有找到同时具备来源和原文摘录的主张');
  vi.unstubAllGlobals();
});

it('shows the cloud failure reason in the result area', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    json: async () => url.includes('local/status')
      ? { state: 'service_unavailable' }
      : { state: 'provider_error', message: '当前凭证不可用' },
  })));
  render(<RuntimePanel text="测试材料" />);
  await userEvent.click(screen.getByRole('button', { name: '检测并分析当前材料' }));

  expect(await screen.findByTestId('human-review-slip')).toHaveTextContent('云端复核没有完成');
  expect(screen.getByTestId('human-review-slip')).toHaveTextContent('当前凭证不可用');
  vi.unstubAllGlobals();
});

it('does not leave a previous local archive action under a later cloud failure', async () => {
  let request = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('local/status')) return { json: async () => ({ state: 'service_ready', model_state: 'ready' }) };
    request += 1;
    return { json: async () => request === 1
      ? { state: 'service_ready', result: { summary: '本地旧结果' } }
      : { state: 'provider_error', message: '云端失败' } };
  }));
  render(<RuntimePanel text="测试材料" onAcceptLocalInsight={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: '使用端侧模型分析' }));
  expect(await screen.findByRole('button', { name: '确认并加入档案' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: '检测并分析当前材料' }));

  expect(await screen.findByText('云端复核没有完成')).toBeVisible();
  expect(screen.queryByRole('button', { name: '确认并加入档案' })).not.toBeInTheDocument();
  vi.unstubAllGlobals();
});

it('lets a reviewer add structured Qwen findings to the dossier', async () => {
  const accept = vi.fn();
  const finding = { statement: '试点节能 18%', risk: '周期过短', repair: '补充对照实验', source: 'report.pdf · P3', excerpt: '试点节能 18%' };
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    json: async () => url.includes('local/status') ? { state: 'service_unavailable' } : { state: 'provider_ready', claims: [finding] },
  })));
  render(<RuntimePanel text="测试材料" onAcceptQwenFindings={accept} />);
  await userEvent.click(screen.getByRole('button', { name: '检测并分析当前材料' }));
  await userEvent.click(await screen.findByRole('button', { name: '确认 1 条云端发现并加入档案' }));
  expect(accept).toHaveBeenCalledWith([finding]);
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

it('shows a live elapsed timer while local analysis is running', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('local/status')) return { json: async () => ({ state: 'service_ready', model_state: 'ready' }) };
    return new Promise(() => undefined);
  }));
  render(<RuntimePanel text="测试材料" />);

  screen.getByRole('button', { name: '使用端侧模型分析' }).click();
  await vi.advanceTimersByTimeAsync(2_000);

  expect(screen.getByRole('status')).toHaveTextContent('正在分析');
  expect(screen.getByRole('status')).toHaveTextContent('00:02');
  expect(screen.getByRole('button', { name: /分析中 00:02/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: '等待本地分析完成' })).toBeDisabled();
  vi.useRealTimers();
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

it('shows convergence when an accepted review produces no dossier changes', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    json: async () => url.includes('local/status')
      ? { state: 'service_ready', model_state: 'ready' }
      : { state: 'service_ready', result: { summary: '重复主张' } },
  })));
  const noChange = { added: 0, updated: 0, merged: 1, resolved: 0, unchanged: 1, remaining: 2, changedClaimIds: [] };
  render(<RuntimePanel text="测试材料" scopeCount={2} onAcceptLocalInsight={() => noChange} />);
  await userEvent.click(screen.getByRole('button', { name: '使用端侧模型分析' }));
  await userEvent.click(await screen.findByRole('button', { name: '确认并加入档案' }));
  expect(screen.getByTestId('human-review-slip')).toHaveTextContent('本轮无新增变化');
  expect(screen.getByTestId('human-review-slip')).toHaveTextContent('剩余 2 条待复核');
  vi.unstubAllGlobals();
});

it('sends only the supplied unresolved review scope to Qwen', async () => {
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => ({
    json: async () => url.includes('local/status') ? { state: 'service_ready' } : { state: 'provider_ready', claims: [] },
    options,
  }));
  vi.stubGlobal('fetch', fetchMock);
  render(<RuntimePanel text="仅包含未解决主张" scopeCount={2} />);
  await userEvent.click(screen.getByRole('button', { name: '复核 2 条未解决主张' }));
  const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/api/qwen/analyze'));
  expect(JSON.parse(String(call?.[1]?.body))).toEqual({ text: '仅包含未解决主张' });
  vi.unstubAllGlobals();
});
