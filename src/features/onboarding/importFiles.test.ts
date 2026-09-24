import { validateFiles } from './importFiles';

const fakeFile = (name: string, size = 32) => new File(['x'.repeat(size)], name);

describe('project file validation', () => {
  it('rejects an empty selection with a recoverable message', () => {
    expect(validateFiles([])).toEqual({ ok: false, message: '请选择至少一个项目文件' });
  });

  it('rejects a collection containing only unsupported formats', () => {
    expect(validateFiles([fakeFile('archive.exe')])).toEqual({
      ok: false,
      message: '暂不支持这些文件，请选择 PDF、文档、数据或图片',
    });
  });

  it('rejects a supported file above 10MB', () => {
    expect(validateFiles([fakeFile('report.pdf', 10 * 1024 * 1024 + 1)])).toMatchObject({
      ok: false,
      message: expect.stringContaining('report.pdf'),
    });
  });

  it('accepts supported files and reports ignored extras', () => {
    expect(validateFiles([fakeFile('report.pdf'), fakeFile('notes.md'), fakeFile('tool.exe')])).toEqual({
      ok: true,
      files: expect.arrayContaining([expect.objectContaining({ name: 'report.pdf' }), expect.objectContaining({ name: 'notes.md' })]),
      ignored: ['tool.exe'],
    });
  });
});
