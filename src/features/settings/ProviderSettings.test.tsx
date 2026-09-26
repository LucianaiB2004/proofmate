import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ProviderSettings } from './ProviderSettings';

it('saves provider credentials without displaying their full values', async () => {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options?: RequestInit) => ({
    json: async () => options?.method === 'POST'
      ? { dashscope: { configured: true, hint: '…1234' }, textin: { configured: true, appIdHint: '…a40' } }
      : { dashscope: { configured: false, hint: '' }, textin: { configured: false, appIdHint: '' } },
  })));
  render(<ProviderSettings onClose={() => undefined} />);

  await userEvent.type(screen.getByLabelText('百炼 API Key'), 'private-qwen-1234');
  await userEvent.type(screen.getByLabelText('TextIn App ID'), 'private-app-a40');
  await userEvent.type(screen.getByLabelText('TextIn Secret Code'), 'private-textin-secret');
  await userEvent.click(screen.getByRole('button', { name: '保存本机设置' }));

  expect(await screen.findByText('设置已保存，仅供本机代理使用。')).toBeVisible();
  expect(screen.queryByDisplayValue('private-qwen-1234')).not.toBeInTheDocument();
  expect(screen.getByText(/百炼.*已配置.*1234/)).toBeVisible();
  expect(screen.getByText(/TextIn xParse.*已配置.*a40/)).toBeVisible();
  vi.unstubAllGlobals();
});
