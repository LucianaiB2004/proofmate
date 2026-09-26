import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ScanSequence } from './ScanSequence';
import { FileDropzone } from './FileDropzone';

it('replays the sample scan and returns the prepared audit', async () => {
  vi.useFakeTimers();
  const onComplete = vi.fn();
  render(<ScanSequence onComplete={onComplete} />);

  expect(screen.getByText('材料清点仪')).toBeVisible();
  expect(screen.getByText('隐私检查仪')).toBeVisible();
  expect(screen.getByText('模型核验仪')).toBeVisible();
  await act(async () => vi.advanceTimersByTimeAsync(2400));
  expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ name: '校园节能 AI 调度系统' }));
  vi.useRealTimers();
});

it('opens the real material picker from the primary landing action', async () => {
  const { App } = await import('../../App');
  render(<App />);
  const input = screen.getByLabelText('拖入你的项目材料');
  const click = vi.spyOn(input, 'click');
  await userEvent.click(screen.getByRole('button', { name: '开始审查我的材料' }));
  expect(click).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: '查看案例展示' })).toBeVisible();
});

it('labels imported material as a real local review', () => {
  vi.useFakeTimers();
  render(<ScanSequence files={[new File(['evidence'], '真实材料.txt')]} onComplete={vi.fn()} />);

  expect(screen.getByText('真实材料 · LOCAL FIRST')).toBeVisible();
  expect(screen.getByText('材料清点仪')).toBeVisible();
  expect(screen.getByText('文字提取仪')).toBeVisible();
  expect(screen.getByText('模型核验仪')).toBeVisible();
  expect(screen.getByText(/已接收 1 份真实材料/)).toBeVisible();
  vi.useRealTimers();
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

it('accepts a PDF immediately without an extra OCR consent control', async () => {
  const onFilesAccepted = vi.fn();
  render(<FileDropzone onFilesAccepted={onFilesAccepted} />);
  await userEvent.upload(screen.getByLabelText('拖入你的项目材料'), new File(['scan'], 'scan.pdf', { type: 'application/pdf' }));
  expect(onFilesAccepted).toHaveBeenCalledWith([expect.objectContaining({ name: 'scan.pdf' })]);
  expect(screen.getByText('已选择 1 个文件')).toBeVisible();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

it('accepts an image immediately and lets the extraction pipeline use OCR', async () => {
  const onFilesAccepted = vi.fn();
  render(<FileDropzone onFilesAccepted={onFilesAccepted} />);
  await userEvent.upload(screen.getByLabelText('拖入你的项目材料'), new File(['pixels'], 'scan.png', { type: 'image/png' }));
  expect(onFilesAccepted).toHaveBeenCalledWith([expect.objectContaining({ name: 'scan.png' })]);
  expect(screen.getByText('已选择 1 个文件')).toBeVisible();
});
