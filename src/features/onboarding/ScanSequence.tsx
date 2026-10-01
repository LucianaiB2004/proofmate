import { useEffect, useState } from 'react';
import { demoProject as defaultDemoProject } from '../../data/demoProject';
import type { ProjectAudit } from '../../domain/types';
import { buildImportedAudit } from './buildImportedAudit';
import pixelScanner from '../../assets/archive/pixel-scanner.webp';
import { extractFile } from './extractFileText';
import { parseWithTextInBrowser } from './textInBrowserClient';
import type { BrowserProviderCredentials } from '../settings/providerCredentials';

const demoStages = [
  { label: '材料清点仪', detail: '样例回放：识别 12 份项目材料，原始文件不离开设备。', mode: 'DEVICE' },
  { label: '隐私检查仪', detail: '样例回放：发现 2 处潜在个人信息，已在本地标记。', mode: 'PRIVATE' },
  { label: '模型核验仪', detail: '样例回放：构建 6 条主张与 10 个证据节点。', mode: 'CLOUD' },
];

export function ScanSequence({ files, demoProject = defaultDemoProject, onComplete, publicDemo = false, credentials }: { files?: File[] | null; demoProject?: ProjectAudit; onComplete: (audit: ProjectAudit) => void; publicDemo?: boolean; credentials?: BrowserProviderCredentials }) {
  const [activeStage, setActiveStage] = useState(0);
  const stages = files?.length ? [
    { label: '材料清点仪', detail: `已接收 ${files.length} 份真实材料；文本型 PDF 在浏览器读取，扫描 PDF 与图片自动交给 xParse OCR。`, mode: 'DEVICE' },
    { label: '文字提取仪', detail: '读取文本与 PDF 正文；无内嵌文字的扫描 PDF 和图片通过 xParse OCR 转成可核对文字。', mode: publicDemo ? 'CLOUD' : 'PRIVATE' },
    { label: '模型核验仪', detail: publicDemo ? '文件读取不是模型分析；进入档案后运行 Qwen 云端初审，候选结果仍需人工确认。' : '文件读取不是模型分析；进入档案后先运行 OpenVINO 端侧初审，再按需使用 Qwen 复核。', mode: 'READY' },
  ] : demoStages.map((stage, index) => index === 2 ? { ...stage, detail: `样例回放：构建 ${demoProject.claims.length} 条主张与 ${demoProject.evidence.length} 个证据节点。` } : stage);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setActiveStage(1), 800),
      window.setTimeout(() => setActiveStage(2), 1600),
      window.setTimeout(() => { void (files?.length ? buildImportedAudit(files, publicDemo ? (file) => extractFile(file, undefined, (image) => parseWithTextInBrowser(image, { appId: credentials?.textinAppId ?? '', secretCode: credentials?.textinSecretCode ?? '' })) : undefined, publicDemo).then(onComplete) : Promise.resolve(onComplete(demoProject))); }, 2400),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [files, demoProject, onComplete, publicDemo, credentials]);

  return (
    <main className="scan-shell">
      <header className="scan-header">
        <img className="pixel-scanner" src={pixelScanner} alt="" />
        <p className="eyebrow">{files?.length ? publicDemo ? '真实材料 · CLOUD WORKSPACE' : '真实材料 · LOCAL FIRST' : '样例分析回放 · DEMO REPLAY'}</p>
        <h1>正在重建项目的证据链</h1>
        <p>{publicDemo ? '浏览器先读取正文，图片与扫描件按需进入 xParse，候选主张再由 Qwen 分析。' : '端侧先处理隐私与索引，必要片段再进入云端推理。'}</p>
      </header>
      <ol className="scan-stages">
        {stages.map((stage, index) => (
          <li key={stage.label} className={index <= activeStage ? 'is-active' : ''} aria-current={index === activeStage ? 'step' : undefined}>
            <span className="stage-index">0{index + 1}</span>
            <div className="instrument-readout">
              <small><i className="status-light" aria-hidden="true" />{stage.mode}</small>
              <strong>{stage.label}</strong>
              <p>{stage.detail}</p>
              {index === activeStage && <span className="scanner-line" aria-hidden="true" />}
            </div>
            <span className="stage-state">{index < activeStage ? '完成' : index === activeStage ? '处理中' : '等待'}</span>
          </li>
        ))}
      </ol>
      <div className="scan-progress" aria-label={`扫描进度 ${Math.round(((activeStage + 1) / stages.length) * 100)}%`}>
        <span style={{ width: `${((activeStage + 1) / stages.length) * 100}%` }} />
      </div>
    </main>
  );
}
