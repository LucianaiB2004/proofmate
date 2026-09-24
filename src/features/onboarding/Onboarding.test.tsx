import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ScanSequence } from './ScanSequence';

it('replays the sample scan and returns the prepared audit', async () => {
  vi.useFakeTimers();
  const onComplete = vi.fn();
  render(<ScanSequence onComplete={onComplete} />);

  expect(screen.getByText('端侧材料清点')).toBeVisible();
  await act(async () => vi.advanceTimersByTimeAsync(2400));
  expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ name: '校园节能 AI 调度系统' }));
  vi.useRealTimers();
});

it('starts the sample scan from the landing page', async () => {
  const { App } = await import('../../App');
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: '体验示例项目' }));
  expect(screen.getByRole('heading', { name: '正在重建项目的证据链' })).toBeVisible();
});
