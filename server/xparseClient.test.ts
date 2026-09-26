import { getXParseInvocation, isXParseSupported } from './xparseClient';

it('runs the npm command shim through the Windows command interpreter', () => {
  expect(getXParseInvocation('win32')).toEqual({ command: 'xparse-cli.cmd', shell: true });
  expect(getXParseInvocation('linux')).toEqual({ command: 'xparse-cli', shell: false });
});

it('accepts scanned PDFs as xParse input', () => {
  expect(isXParseSupported('scan.pdf')).toBe(true);
  expect(isXParseSupported('notes.exe')).toBe(false);
});
