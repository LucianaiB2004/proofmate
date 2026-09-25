import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ScanSequence } from './ScanSequence';
import { FileDropzone } from './FileDropzone';

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

it('keeps a long imported filename available to people and layout checks', async () => {
  const user = userEvent.setup();
  const onFilesAccepted = vi.fn();
  const filename = `${'毕业设计证据材料'.repeat(12)}.pdf`;
  render(<FileDropzone onFilesAccepted={onFilesAccepted} />);

  await user.upload(screen.getByLabelText('拖入你的项目材料'), new File(['paper'], filename, { type: 'application/pdf' }));

  expect(screen.getByTestId('accepted-materials')).toHaveTextContent(filename);
  expect(onFilesAccepted).toHaveBeenCalledOnce();
});
