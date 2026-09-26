import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface ProviderSecrets {
  dashscopeApiKey?: string;
  textinAppId?: string;
  textinSecretCode?: string;
}

export const settingsPath = path.resolve('.proofmate.local.json');

export async function readProviderSecrets(filePath = settingsPath): Promise<ProviderSecrets> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as ProviderSecrets;
  } catch {
    return {};
  }
}

export async function saveProviderSecrets(input: ProviderSecrets, filePath = settingsPath) {
  const current = await readProviderSecrets(filePath);
  const next = {
    dashscopeApiKey: input.dashscopeApiKey?.trim() || current.dashscopeApiKey || '',
    textinAppId: input.textinAppId?.trim() || current.textinAppId || '',
    textinSecretCode: input.textinSecretCode?.trim() || current.textinSecretCode || '',
  };
  await writeFile(filePath, JSON.stringify(next, null, 2), { encoding: 'utf8', mode: 0o600 });
  return next;
}

const hint = (value = '', length = 4) => value ? `…${value.slice(-length)}` : '';

export function providerStatus(secrets: ProviderSecrets) {
  return {
    dashscope: { configured: Boolean(secrets.dashscopeApiKey), hint: hint(secrets.dashscopeApiKey) },
    textin: { configured: Boolean(secrets.textinAppId && secrets.textinSecretCode), appIdHint: hint(secrets.textinAppId, 3) },
  };
}
