import { calculateAuditScore } from '../../domain/audit';
import type { Claim, EvidenceItem, ProjectAudit } from '../../domain/types';
import { extractFileText } from './extractFileText';

const excerpt = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 180);

export async function buildImportedAudit(files: File[], extractor = extractFileText): Promise<ProjectAudit> {
  const parsed = await Promise.all(files.map(async (file) => {
    try { return { file, text: await extractor(file), error: '' }; }
    catch (error) { return { file, text: '', error: error instanceof Error ? error.message : '未知错误' }; }
  }));
  const contents = parsed.filter((item) => item.text.trim());
  const readable = contents.map((item) => item.file);
  const evidence: EvidenceItem[] = files.map((file, index) => {
    const result = parsed.find((item) => item.file === file);
    const text = result?.text ?? '';
    return {
      id: `import-evidence-${index}`,
      title: file.name,
      kind: file.name.match(/\.(csv|json)$/i) ? 'data' : file.name.match(/\.(png|jpe?g|webp)$/i) ? 'image' : 'document',
      excerpt: text ? excerpt(text) : result?.error ? `PDF 解析失败：${result.error}。请检查加密或损坏状态后重试。` : '浏览器已完成文件清点；图片需启用 OCR 后解析内容。',
      source: file.name,
      confidence: text ? 0.72 : 0.35,
    };
  });
  const statements = contents.flatMap(({ text }) => text.split(/[。！？\n]+/).map(excerpt).filter((line) => line.length >= 8)).slice(0, 6);
  const claims: Claim[] = (statements.length ? statements : ['材料已接收，内容待模型解析']).map((statement, index) => ({
    id: `import-claim-${index}`,
    statement,
    status: readable.length ? 'weak' : 'missing',
    importance: index === 0 ? 'critical' : 'medium',
    evidenceIds: evidence[index % evidence.length] ? [evidence[index % evidence.length].id] : [],
    risk: readable.length ? '这是浏览器端抽取的候选主张，尚未经过模型交叉核验。' : '当前格式未在浏览器解读，不能声称已完成语义分析。',
    repair: '启用端侧 OpenVINO 或百炼 Qwen 后执行语义核验，并补充来源页码与实验记录。',
  }));
  const dimensions = { coverage: readable.length ? 55 : 20, consistency: 45, freshness: 50, reproducibility: 35 };
  return {
    id: `import-${Date.now()}`,
    name: `我的材料 · ${files.map((file) => file.name).join('、').slice(0, 48)}`,
    dimensions,
    score: calculateAuditScore(dimensions), claims, evidence,
    trace: [
      { stage: 'device', label: '真实文件清点', detail: `已在浏览器接收 ${files.length} 份材料。` },
      { stage: 'device', label: '本地文本抽取', detail: `${readable.length} 份材料已读取；${parsed.filter((item) => item.error).map((item) => `${item.file.name} 解析失败：${item.error}`).join('；') || `${files.length - readable.length} 份图片未执行 OCR`}。` },
      { stage: 'cloud', label: '模型核验待命', detail: '当前仅展示真实本地抽取结果；配置运行时后可继续模型分析。' },
    ],
  };
}
