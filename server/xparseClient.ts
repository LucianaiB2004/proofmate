import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { ProviderSecrets } from './providerSettings.ts';

const exec = promisify(execFile);
const imageExtensions = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff']);

export function getXParseInvocation(platform = process.platform) {
  return platform === 'win32' ? { command: 'xparse-cli.cmd', shell: true } : { command: 'xparse-cli', shell: false };
}

export async function parseImageWithXParse(name: string, base64: string, secrets: ProviderSecrets) {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  if (!imageExtensions.has(extension)) throw new Error('unsupported_image');
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'proofmate-xparse-'));
  const input = path.join(workspace, `input.${extension}`);
  const output = path.join(workspace, 'result');
  try {
    await writeFile(input, Buffer.from(base64, 'base64'));
    const invocation = getXParseInvocation();
    await exec(invocation.command, ['parse', input, '--api', 'auto', '--output', output], {
      timeout: 120_000,
      windowsHide: true,
      shell: invocation.shell,
      env: {
        ...process.env,
        ...(secrets.textinAppId ? { XPARSE_APP_ID: secrets.textinAppId } : {}),
        ...(secrets.textinSecretCode ? { XPARSE_SECRET_CODE: secrets.textinSecretCode } : {}),
      },
    });
    const resultName = (await readdir(output)).find((file) => file.endsWith('.md'));
    if (!resultName) throw new Error('missing_xparse_result');
    return await readFile(path.join(output, resultName), 'utf8');
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}
