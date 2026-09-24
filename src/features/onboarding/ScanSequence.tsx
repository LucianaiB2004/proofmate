import { useEffect, useState } from 'react';
import { demoProject } from '../../data/demoProject';
import type { ProjectAudit } from '../../domain/types';

const stages = [
  { label: '端侧材料清点', detail: '识别 12 份项目材料，原始文件不离开设备。', mode: 'DEVICE' },
  { label: '隐私边界检查', detail: '发现 2 处潜在个人信息，已在本地标记。', mode: 'PRIVATE' },
  { label: 'Qwen 证据映射', detail: '样例回放正在构建 6 条主张与 10 个证据节点。', mode: 'CLOUD' },
];

export function ScanSequence({ onComplete }: { onComplete: (audit: ProjectAudit) => void }) {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setActiveStage(1), 800),
      window.setTimeout(() => setActiveStage(2), 1600),
      window.setTimeout(() => onComplete(demoProject), 2400),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [onComplete]);

  return (
    <main className="scan-shell">
      <header className="scan-header">
        <p className="eyebrow">样例分析回放 · DEMO REPLAY</p>
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
