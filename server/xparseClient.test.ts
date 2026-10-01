import { getXParseInvocation, isXParseSupported, readXParseServiceMessage, toXParseFailure, XParseFailure } from './xparseClient';

it('runs the npm command shim through the Windows command interpreter', () => {
  expect(getXParseInvocation('win32')).toEqual({ command: 'xparse-cli.cmd', shell: true });
  expect(getXParseInvocation('linux')).toEqual({ command: 'xparse-cli', shell: false });
});

it('accepts scanned PDFs as xParse input', () => {
  expect(isXParseSupported('scan.pdf')).toBe(true);
  expect(isXParseSupported('notes.exe')).toBe(false);
});

it('accepts every image format the xParse service reports as supported', () => {
  expect(['scan.png', 'scan.jpg', 'scan.jpeg', 'scan.webp', 'scan.bmp', 'scan.tif', 'scan.tiff'].map(isXParseSupported))
    .toEqual([true, true, true, true, true, true, true]);
});

describe('xParse failure reporting', () => {
  it('reports a timeout instead of the raw Node command error', () => {
    const failure = toXParseFailure(Object.assign(new Error('Command failed: xparse-cli.cmd parse C:\\Temp\\proofmate-xparse-abc\\input.jpg'), { killed: true, signal: 'SIGTERM' }));

    expect(failure).toBeInstanceOf(XParseFailure);
    expect(failure.code).toBe('parse_timeout');
    expect(failure.message).toContain('120 秒');
    expect(failure.message).not.toContain('Command failed');
    expect(failure.message).not.toContain('proofmate-xparse');
  });

  it('tells the user to install the CLI when the binary is missing', () => {
    const failure = toXParseFailure(Object.assign(new Error('spawn xparse-cli ENOENT'), { code: 'ENOENT' }));

    expect(failure.code).toBe('cli_unavailable');
    expect(failure.message).toContain('xparse-cli');
  });

  it('recognizes the Windows command-shim missing error as an unavailable CLI', () => {
    const failure = toXParseFailure(Object.assign(new Error('Command failed'), {
      code: 1,
      stderr: "'xparse-cli.cmd' is not recognized as an internal or external command, operable program or batch file.",
    }));

    expect(failure.code).toBe('cli_unavailable');
    expect(failure.message).toContain('xparse-cli');
  });

  it('surfaces the service message from an xparse_error.v1 stderr object', () => {
    const stderr = JSON.stringify({ schema_version: 'xparse_error.v1', code: 'QUOTA_EXHAUSTED', retryable: false, message: '今日免费额度已用完' });
    const failure = toXParseFailure(Object.assign(new Error('Command failed'), { code: 1, stderr }));

    expect(failure.code).toBe('parse_failed');
    expect(failure.message).toContain('今日免费额度已用完');
  });

  it('falls back to a stable message when the CLI error carries no usable detail', () => {
    const failure = toXParseFailure(Object.assign(new Error('Command failed: xparse-cli.cmd parse /tmp/x/input.jpg'), { code: 1, stderr: 'not json' }));

    expect(failure.message).toBe('TextIn xParse 解析失败，请检查网络、凭证或文件状态后重试。');
  });

  it('keeps an already-classified failure unchanged', () => {
    const original = new XParseFailure('missing_result');
    expect(toXParseFailure(original)).toBe(original);
  });
});

describe('readXParseServiceMessage', () => {
  it('reads the last xparse_error.v1 object out of multi-line stderr', () => {
    const stderr = ['uploading file', JSON.stringify({ schema_version: 'xparse_error.v1', message: '解析服务暂时不可用' })].join('\n');
    expect(readXParseServiceMessage(stderr)).toBe('解析服务暂时不可用');
  });

  it('prefers the latest xparse_error.v1 object when stderr contains more than one', () => {
    const stderr = [
      JSON.stringify({ schema_version: 'xparse_error.v1', message: '旧错误' }),
      JSON.stringify({ schema_version: 'xparse_error.v1', message: '最终错误' }),
    ].join('\n');
    expect(readXParseServiceMessage(stderr)).toBe('最终错误');
  });

  it('ignores stderr that is not an xparse_error.v1 envelope', () => {
    expect(readXParseServiceMessage('{"schema_version":"other.v1","message":"x"}')).toBe('');
    expect(readXParseServiceMessage('')).toBe('');
  });
});
