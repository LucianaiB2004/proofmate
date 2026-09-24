const supportedExtensions = new Set(['pdf', 'md', 'txt', 'csv', 'json', 'png', 'jpg', 'jpeg', 'webp']);
const maxFileSize = 10 * 1024 * 1024;

export type ImportResult =
  | { ok: false; message: string }
  | { ok: true; files: File[]; ignored: string[] };

export function validateFiles(input: File[] | FileList): ImportResult {
  const files = Array.from(input);
  if (files.length === 0) return { ok: false, message: '请选择至少一个项目文件' };

  const supported = files.filter((file) => supportedExtensions.has(file.name.split('.').pop()?.toLowerCase() ?? ''));
  if (supported.length === 0) {
    return { ok: false, message: '暂不支持这些文件，请选择 PDF、文档、数据或图片' };
  }

  const oversized = supported.find((file) => file.size > maxFileSize);
  if (oversized) return { ok: false, message: `${oversized.name} 超过 10MB，请压缩后重试` };

  return {
    ok: true,
    files: supported,
    ignored: files.filter((file) => !supported.includes(file)).map((file) => file.name),
  };
}
