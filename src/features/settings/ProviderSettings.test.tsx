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

it('keeps public credentials in parent memory without calling the local settings API', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const onChange = vi.fn();

  render(<ProviderSettings onClose={() => undefined} publicDemo publicCredentials={{ dashscopeApiKey: '', qwenModel: 'qwen-plus', textinAppId: '', textinSecretCode: '' }} onPublicCredentialsChange={onChange} />);

  await userEvent.type(screen.getByLabelText('百炼 API Key'), 'temporary-qwen-key');
  await userEvent.type(screen.getByLabelText('TextIn App ID'), 'temporary-app-id');
  await userEvent.type(screen.getByLabelText('TextIn Secret Code'), 'temporary-secret');
  await userEvent.click(screen.getByRole('button', { name: '应用到本次页面' }));
  expect(onChange).toHaveBeenCalledWith({ dashscopeApiKey: 'temporary-qwen-key', qwenModel: 'qwen-plus', textinAppId: 'temporary-app-id', textinSecretCode: 'temporary-secret' });
  expect(screen.getByText('已应用到本次页面；刷新页面后自动清除。')).toBeVisible();
  expect(fetchMock).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

it('can explicitly clear credentials kept for the current page', async () => {
  const onChange = vi.fn();
  render(<ProviderSettings onClose={() => undefined} publicDemo publicCredentials={{ dashscopeApiKey: 'key', qwenModel: 'qwen-plus', textinAppId: 'app', textinSecretCode: 'secret' }} onPublicCredentialsChange={onChange} />);
  await userEvent.click(screen.getByRole('button', { name: '清除本次凭证' }));
  expect(onChange).toHaveBeenCalledWith({ dashscopeApiKey: '', qwenModel: 'qwen-plus', textinAppId: '', textinSecretCode: '' });
  expect(screen.getByText('本次页面凭证已清除。')).toBeVisible();
});
