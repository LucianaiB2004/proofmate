import { useEffect, useState } from 'react';
import { demoProject } from '../../data/demoProject';
import type { ProjectAudit } from '../../domain/types';
import { buildImportedAudit } from './buildImportedAudit';

const demoStages = [
  { label: '端侧材料清点', detail: '识别 12 份项目材料，原始文件不离开设备。', mode: 'DEVICE' },
  { label: '隐私边界检查', detail: '发现 2 处潜在个人信息，已在本地标记。', mode: 'PRIVATE' },
  { label: 'Qwen 证据映射', detail: '样例回放正在构建 6 条主张与 10 个证据节点。', mode: 'CLOUD' },
];

export function ScanSequence({ files, onComplete }: { files?: File[] | null; onComplete: (audit: ProjectAudit) => void }) {
  const [activeStage, setActiveStage] = useState(0);
  const stages = files?.length ? [
    { label: '端侧材料清点', detail: `已接收 ${files.length} 份真实材料，原始文件不离开浏览器。`, mode: 'DEVICE' },
    { label: '本地内容抽取', detail: '读取文本、CSV、JSON 与 PDF 正文；图片仅清点，不伪造 OCR 结果。', mode: 'PRIVATE' },
    { label: '模型核验待命', detail: '先生成本地候选；进入驾驶舱后可检测 Qwen / OpenVINO。', mode: 'READY' },
  ] : demoStages;

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setActiveStage(1), 800),
      window.setTimeout(() => setActiveStage(2), 1600),
      window.setTimeout(() => { void (files?.length ? buildImportedAudit(files).then(onComplete) : Promise.resolve(onComplete(demoProject))); }, 2400),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [files, onComplete]);

  return (
    <main className="scan-shell">
      <header className="scan-header">
        <p className="eyebrow">{files?.length ? '真实材料 · LOCAL FIRST' : '样例分析回放 · DEMO REPLAY'}</p>
        <h1>正在重建项目的证据链</h1>
        <p>端侧先处理隐私与索引，必要片段再进入云端推理。</p>
      </header>
      <ol className="scan-stages">
        {stages.map((stage, index) => (
          <li key={stage.label} className={index <= activeStage ? 'is-active' : ''}>
            <span className="stage-index">0{index + 1}</span>
            <div>
              <small>{stage.mode}</small>
              <strong>{stage.label}</strong>
              <p>{stage.detail}</p>
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
