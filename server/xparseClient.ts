import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { ProviderSecrets } from './providerSettings.ts';

const exec = promisify(execFile);
const supportedExtensions = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff']);

export type XParseFailureCode =
  | 'unsupported_document'
  | 'cli_unavailable'
  | 'parse_timeout'
  | 'missing_result'
  | 'parse_failed';

const failureMessages: Record<XParseFailureCode, string> = {
  unsupported_document: '这份材料不在 TextIn xParse 支持的图片或 PDF 范围内，请改用 PDF、PNG、JPG、WEBP、BMP 或 TIFF。',
  cli_unavailable: '本机没有检测到官方 xparse-cli，请先执行 npm i -g xparse-cli 后重试。',
  parse_timeout: 'TextIn xParse 超过 120 秒仍未返回结果，本次没有生成任何文字；请稍后重试或改用更小的文件。',
  missing_result: 'TextIn xParse 已完成调用，但没有返回可读取的 Markdown 结果；请稍后重试。',
  parse_failed: 'TextIn xParse 解析失败，请检查网络、凭证或文件状态后重试。',
};

export class XParseFailure extends Error {
  constructor(public code: XParseFailureCode, message = failureMessages[code]) {
    super(message);
    this.name = 'XParseFailure';
  }
}

export function isXParseSupported(name: string) {
  return supportedExtensions.has(name.split('.').pop()?.toLowerCase() ?? '');
}

export function getXParseInvocation(platform = process.platform) {
  return platform === 'win32' ? { command: 'xparse-cli.cmd', shell: true } : { command: 'xparse-cli', shell: false };
}

interface XParseErrorEnvelope { schema_version?: string; code?: string; message?: string }

/**
 * 读取 xparse-cli 在 stderr 上输出的最后一个 `xparse_error.v1` 对象。
 * 服务端自己的 message 可以安全展示；CLI 原始报错（含本机临时路径）不会被透传。
 */
export function readXParseServiceMessage(stderr = '') {
  const text = stderr.trim();
  if (!text) return '';
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const candidates = [...lines.reverse(), text];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as XParseErrorEnvelope;
      if (parsed.schema_version === 'xparse_error.v1' && typeof parsed.message === 'string' && parsed.message.trim()) {
        return parsed.message.trim();
      }
    } catch { /* 不是 xparse_error.v1 的 JSON，继续检查下一行 */ }
  }
  return '';
}

/**
 * 把底层进程错误翻译成区分「超时 / 未安装 CLI / 服务报错 / 未知」的提示。
 * 只保留可解释的状态，不把 Node 的 `Command failed: ...` 与本机临时路径暴露给页面。
 */
export function toXParseFailure(error: unknown): XParseFailure {
  if (error instanceof XParseFailure) return error;
  const detail = error as { killed?: boolean; signal?: string | null; code?: string | number | null; stderr?: string } | undefined;
  if (detail?.code === 'ENOENT') return new XParseFailure('cli_unavailable');
  if (detail?.killed || detail?.signal === 'SIGTERM' || detail?.code === 'ETIMEDOUT') return new XParseFailure('parse_timeout');
  const stderr = typeof detail?.stderr === 'string' ? detail.stderr : '';
  if (/not recognized as an internal or external command|不是内部或外部命令/i.test(stderr)) {
    return new XParseFailure('cli_unavailable');
  }
  const reported = readXParseServiceMessage(stderr);
  return new XParseFailure('parse_failed', reported ? `TextIn xParse 解析失败：${reported}` : failureMessages.parse_failed);
}

export async function parseImageWithXParse(name: string, base64: string, secrets: ProviderSecrets) {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  if (!isXParseSupported(name)) throw new XParseFailure('unsupported_document');
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'proofmate-xparse-'));
  const input = path.join(workspace, `input.${extension}`);
  const output = path.join(workspace, 'result');
  try {
    await writeFile(input, Buffer.from(base64, 'base64'));
    const invocation = getXParseInvocation();
    try {
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
    } catch (error) {
      throw toXParseFailure(error);
    }
    const resultName = (await readdir(output).catch(() => [] as string[])).find((file) => file.endsWith('.md'));
    if (!resultName) throw new XParseFailure('missing_result');
    return await readFile(path.join(output, resultName), 'utf8');
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}
