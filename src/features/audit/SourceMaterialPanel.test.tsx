import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SourceMaterialPanel } from './SourceMaterialPanel';
import { sourceFileFingerprint } from '../onboarding/extractFileText';

const evidence = [{
  id: 'source-1',
  title: '恢复材料.pdf',
  kind: 'document' as const,
  excerpt: '恢复后的摘要',
  content: '恢复后仍然保存的提取正文',
  extractionMethod: 'pdfjs' as const,
  source: '恢复材料.pdf',
  confidence: 0.72,
}];

it('lets a restored dossier relink its original file', async () => {
  const onRelink = vi.fn();
  render(<SourceMaterialPanel evidence={evidence} onRelink={onRelink} />);

  expect(screen.getByText('恢复后仍然保存的提取正文')).toBeVisible();
  const input = screen.getByLabelText('重新关联原文件');
  const file = new File(['pdf'], '恢复材料.pdf', { type: 'application/pdf' });
  await userEvent.upload(input, file);

  expect(onRelink).toHaveBeenCalledWith([file]);
});

it('rejects a same-name file when its persisted fingerprint does not match', async () => {
  const onRelink = vi.fn();
  const original = new File(['original'], '恢复材料.pdf', { type: 'application/pdf', lastModified: 100 });
  const replacement = new File(['different'], '恢复材料.pdf', { type: 'application/pdf', lastModified: 200 });
  render(<SourceMaterialPanel evidence={[{ ...evidence[0], sourceFingerprint: sourceFileFingerprint(original) }]} onRelink={onRelink} />);

  await userEvent.upload(screen.getByLabelText('重新关联原文件'), replacement);

  expect(onRelink).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('不是归档时的同一份文件');
});

it('embeds a linked PDF in an iframe with a new-window fallback', () => {
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preview') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  const file = new File(['pdf'], '恢复材料.pdf', { type: 'application/pdf' });
  render(<SourceMaterialPanel evidence={evidence} sourceFiles={[file]} />);

  expect(screen.getByTitle('恢复材料.pdf PDF 原文件')).toBeVisible();
  expect(screen.getByRole('link', { name: '在新窗口打开 PDF' })).toHaveAttribute('target', '_blank');
});

it('shows cleaned text first and reveals raw markup only on request', async () => {
  render(<SourceMaterialPanel evidence={[{ ...evidence[0], content: '测试目标 验证 PDF 提取', rawContent: '<table><td>测试目标</td><td>验证 PDF 提取</td></table>' }]} />);

  expect(screen.getByText('测试目标 验证 PDF 提取')).toBeVisible();
  expect(screen.queryByText(/<table>/)).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '查看原始提取内容' }));
  expect(screen.getByText(/<table>/)).toBeVisible();
});
