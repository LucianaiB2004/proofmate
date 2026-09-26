import { getXParseInvocation } from './xparseClient';

it('runs the npm command shim through the Windows command interpreter', () => {
  expect(getXParseInvocation('win32')).toEqual({ command: 'xparse-cli.cmd', shell: true });
  expect(getXParseInvocation('linux')).toEqual({ command: 'xparse-cli', shell: false });
});
