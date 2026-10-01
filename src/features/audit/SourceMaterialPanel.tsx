import { useEffect, useMemo, useState } from 'react';
import type { EvidenceItem } from '../../domain/types';
import { sourceFileFingerprint, isImageFile } from '../onboarding/extractFileText';

const methodLabel: Record<NonNullable<EvidenceItem['extractionMethod']>, string> = {
  'browser-text': '浏览器直接读取',
  pdfjs: 'PDF.js 正文提取',
  'xparse-ocr': 'TextIn xParse OCR',
  none: '未提取正文',
};

export function SourceMaterialPanel({ evidence, sourceFiles = [], onRelink }: { evidence: EvidenceItem[]; sourceFiles?: File[]; onRelink?: (files: File[]) => void }) {
  const readable = useMemo(() => evidence.filter((item) => item.content || item.extractionMethod), [evidence]);
  const [selectedId, setSelectedId] = useState(readable[0]?.id ?? '');
  const [relinkError, setRelinkError] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const selected = readable.find((item) => item.id === selectedId) ?? readable[0];
  const file = sourceFiles.find((item) => selected?.sourceFingerprint ? sourceFileFingerprint(item) === selected.sourceFingerprint : item.name === selected?.source);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => { setRelinkError(''); setShowRaw(false); }, [selectedId]);

  useEffect(() => {
    if (!file || typeof URL.createObjectURL !== 'function') { setPreviewUrl(''); return; }
    try {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } catch {
      setPreviewUrl('');
    }
  }, [file]);

  if (!readable.length) return null;
  const isImage = file ? file.type.startsWith('image/') || isImageFile(file.name) : false;
  const isPdf = file?.type === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf');
  return (
    <section className="source-material-panel" aria-labelledby="source-material-title">
      <div className="panel-heading"><div><p className="section-kicker">SOURCE READER / EXTRACTION</p><h2 id="source-material-title">原始材料与提取结果</h2></div><span>{readable.length} 份处理记录</span></div>
      <div className="ocr-explainer"><strong>OCR 的作用</strong><p>把图片或扫描件里的字转换成可搜索、可引用的文字；图片或扫描 PDF 会整份通过本机代理交给 TextIn xParse，文本型 PDF 留在浏览器读取。OCR 只负责“读出来”，识别结果可能保留误识别字符，主张、风险和证据关系仍由模型分析并由你确认。请对照右侧原文件逐字核对后再确认关系。</p></div>
      <div className="source-reader-layout">
        <nav className="source-tabs" aria-label="材料列表">{readable.map((item) => <button type="button" aria-pressed={item.id === selected?.id} key={item.id} onClick={() => setSelectedId(item.id)}><strong>{item.title}</strong><span>{methodLabel[item.extractionMethod ?? 'none']}</span></button>)}</nav>
        {selected && <article className="extraction-result">
          <header><div><span>EXTRACTED TEXT</span><h3>{selected.title}</h3></div><b>{methodLabel[selected.extractionMethod ?? 'none']}</b></header>
          <pre>{selected.content || selected.excerpt}</pre>
          {selected.rawContent && <div className="raw-extraction"><button type="button" aria-expanded={showRaw} onClick={() => setShowRaw((value) => !value)}>{showRaw ? '收起原始提取内容' : '查看原始提取内容'}</button>{showRaw && <pre>{selected.rawContent}</pre>}</div>}
        </article>}
        <aside className="original-preview">
          <header><span>ORIGINAL FILE</span><strong>浏览器原文件预览</strong></header>
          {previewUrl && isImage ? <img src={previewUrl} alt={`${selected?.title} 原图`} /> : null}
          {previewUrl && isPdf ? <div className="pdf-preview"><iframe src={`${previewUrl}#view=FitH&toolbar=1`} title={`${selected?.title} PDF 原文件`} /><a href={previewUrl} target="_blank" rel="noreferrer">在新窗口打开 PDF</a></div> : null}
          {!previewUrl && <><p>原文件只保留在当前浏览器会话；刷新或恢复档案后仍可查看提取文字，但需要重新选择原文件才能预览。</p>{onRelink && <label className="relink-source">重新关联原文件<input type="file" accept=".pdf,.md,.txt,.csv,.json,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff" onChange={(event) => { const candidate = event.target.files?.[0]; setRelinkError(''); if (candidate && selected?.sourceFingerprint && sourceFileFingerprint(candidate) !== selected.sourceFingerprint) setRelinkError('这不是归档时的同一份文件，请核对文件大小和修改时间后重试。'); else if (candidate) onRelink([candidate]); event.target.value = ''; }} /></label>}{relinkError && <p className="relink-error" role="alert">{relinkError}</p>}</>}
        </aside>
      </div>
    </section>
  );
}
