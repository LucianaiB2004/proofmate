import { calculateAuditScore } from '../../domain/audit';
import type { EvidenceItem, ProjectAudit } from '../../domain/types';
import { defaultExtractionMethod, ExtractionFailure, extractFile, isImageFile, sourceFileFingerprint, type ExtractedFile } from './extractFileText';
import { cleanExtractedText, segmentExtractedText } from './cleanExtractedText';

const excerpt = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 180);

/** 解析没有文字时，必须区分「调用失败」「OCR 成功但没识别到字」「浏览器读取为空」，不能让它们看起来像同一个状态。 */
function unresolvedExcerpt(file: File, result: { method?: string; error?: string } | undefined) {
  if (result?.error) return `${isImageFile(file.name) ? 'xParse OCR' : 'PDF'} 解析失败：${result.error}`;
  if (result?.method === 'xparse-ocr') return 'TextIn xParse 已返回结果，但这份图片或扫描件没有识别到可核对文字；请确认扫描清晰度或改用更清晰的图片后重试。';
  return '浏览器已完成文件清点；材料未提取到可核对文字。';
}

export async function buildImportedAudit(files: File[], extractor?: (file: File) => Promise<string | ExtractedFile>, cloudOnly = false): Promise<ProjectAudit> {
  const parsed = await Promise.all(files.map(async (file) => {
    try {
      const extracted = extractor ? await extractor(file) : await extractFile(file);
      const result = typeof extracted === 'string' ? { text: extracted, method: defaultExtractionMethod(file) } : extracted;
      return { file, ...result, error: '' };
    }
    catch (error) { return { file, text: '', method: error instanceof ExtractionFailure ? error.method : defaultExtractionMethod(file), error: error instanceof Error ? error.message : '未知错误' }; }
  }));
  const contents = parsed.filter((item) => item.text.trim());
  const readable = contents.map((item) => item.file);
  const evidence: EvidenceItem[] = files.map((file, index) => {
    const result = parsed.find((item) => item.file === file);
    const rawText = result?.text ?? '';
    const text = cleanExtractedText(rawText);
    const id = `import-evidence-${index}`;
    return {
      id,
      title: file.name,
      kind: file.name.match(/\.(csv|json)$/i) ? 'data' : isImageFile(file.name) ? 'image' : 'document',
      excerpt: text ? excerpt(text) : unresolvedExcerpt(file, result),
      content: text ? text.slice(0, 20000) : undefined,
      rawContent: rawText && rawText !== text ? rawText.slice(0, 20000) : undefined,
      fragments: text ? segmentExtractedText(text, file.name, id) : [],
      extractionMethod: result?.method,
      source: file.name,
      sourceFingerprint: sourceFileFingerprint(file),
      confidence: text ? 0.72 : 0.35,
    };
  });
  const dimensions = { coverage: 0, consistency: 0, freshness: 0, reproducibility: 0 };
  return {
    id: `import-${Date.now()}`,
    name: `我的材料 · ${files.map((file) => file.name).join('、').slice(0, 48)}`,
    dimensions,
    score: calculateAuditScore(dimensions), claims: [], evidence,
    trace: [
      { stage: 'device', label: '真实文件清点', detail: `已在浏览器接收 ${files.length} 份材料。` },
      { stage: 'device', label: '文本与 OCR 抽取', detail: `${readable.length} 份材料已读取${contents.some((item) => isImageFile(item.file.name)) ? '，其中图片由 TextIn xParse OCR 转为可核对文字' : ''}；${parsed.filter((item) => item.error).map((item) => `${item.file.name} 解析失败：${item.error}`).join('；') || '全部可读材料均已完成抽取'}。` },
      cloudOnly
        ? { stage: 'cloud', label: 'Qwen 云端初审待运行', detail: '文字提取完成；尚未生成模型主张，运行 Qwen 云端初审后才会产生待人工确认的候选。' }
        : { stage: 'device', label: '端侧初审待运行', detail: '文字提取完成，端侧初审待运行；尚未生成模型主张，运行 OpenVINO 后才会产生待确认候选。' },
    ],
  };
}
