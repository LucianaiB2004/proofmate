import { calculateAuditScore } from '../domain/audit';
import type { EvidenceItem, ProjectAudit } from '../domain/types';

const evidence: EvidenceItem[] = [
  { id: 'ev-report', title: '项目研究报告 v3', kind: 'document', excerpt: '试点区域综合能耗下降 31%。', source: '研究报告.pdf · P12', confidence: 0.91 },
  { id: 'ev-week', title: '7 天试点数据', kind: 'data', excerpt: '试点周平均用电量较基线下降 31.2%。', source: 'pilot-week.csv · 168 行', confidence: 0.78 },
  { id: 'ev-readme', title: '训练代码说明', kind: 'code', excerpt: '模型采用时序特征和环境传感器输入。', source: 'README.md · L34', confidence: 0.94 },
  { id: 'ev-metrics', title: '离线评估表', kind: 'data', excerpt: '验证集准确率 91.8%，F1 为 0.89。', source: 'metrics.json', confidence: 0.98 },
  { id: 'ev-slide', title: '答辩演示稿', kind: 'document', excerpt: '模型准确率 94.6%。', source: '答辩稿.pdf · P8', confidence: 0.96 },
  { id: 'ev-log', title: '边缘部署日志', kind: 'log', excerpt: 'deployment complete; model checksum unavailable', source: 'deploy.log · L208', confidence: 0.87 },
  { id: 'ev-photo', title: '教学楼部署照片', kind: 'image', excerpt: '现场网关与三路传感器已连接。', source: 'site-01.webp', confidence: 0.83 },
  { id: 'ev-latency', title: '延迟压测记录', kind: 'data', excerpt: 'P95 响应时间 182ms，共 2,000 次请求。', source: 'benchmark.csv', confidence: 0.99 },
  { id: 'ev-code', title: '推理管线', kind: 'code', excerpt: '本地异常检测失败后才调用云端解释。', source: 'pipeline.py · L48-L96', confidence: 0.97 },
  { id: 'ev-consent', title: '访谈记录摘要', kind: 'document', excerpt: '值班人员希望保留人工确认入口。', source: 'interviews.md', confidence: 0.81 },
];

const dimensions = { coverage: 68, consistency: 72, freshness: 74, reproducibility: 60 };

export const demoProject: ProjectAudit = {
  id: 'campus-energy-audit',
  name: '校园节能 AI 调度系统',
  score: calculateAuditScore(dimensions),
  dimensions,
  evidence,
  claims: [
    { id: 'claim-energy', statement: '系统可使教学楼综合能耗降低 31%', status: 'weak', importance: 'critical', evidenceIds: ['ev-report', 'ev-week'], risk: '当前结论只来自 7 天试点，天气和课表差异可能放大效果。', repair: '补充至少 30 天、包含同周期对照楼宇的实验数据。' },
    { id: 'claim-accuracy', statement: '负荷预测模型准确率达到 94.6%', status: 'conflict', importance: 'critical', evidenceIds: ['ev-metrics', 'ev-slide'], risk: '离线评估表记录为 91.8%，与答辩稿冲突。', repair: '统一指标口径并附上数据集版本、切分方法和复算日志。' },
    { id: 'claim-latency', statement: '边缘告警 P95 响应时间低于 200ms', status: 'verified', importance: 'high', evidenceIds: ['ev-latency', 'ev-code'], risk: '', repair: '保留原始压测文件供评委抽查。' },
    { id: 'claim-edge', statement: '断网时仍可完成本地异常检测', status: 'verified', importance: 'high', evidenceIds: ['ev-code', 'ev-log'], risk: '', repair: '现场演示可增加断网切换步骤。' },
    { id: 'claim-version', statement: '部署模型与评估模型版本完全一致', status: 'missing', importance: 'high', evidenceIds: ['ev-log'], risk: '部署日志没有模型版本或哈希，无法追溯。', repair: '记录模型 SHA256、量化参数和构建时间。' },
    { id: 'claim-privacy', statement: '传感数据全程不包含可识别个人信息', status: 'missing', importance: 'medium', evidenceIds: ['ev-photo', 'ev-consent'], risk: '项目没有数据字段清单或隐私检查记录。', repair: '添加数据字典与端侧脱敏检查截图。' },
  ],
  trace: [
    { stage: 'device', label: '端侧材料清点', detail: '已读取 7 类文件，原始材料未离开设备。' },
    { stage: 'device', label: 'OpenVINO 语义索引', detail: '在端侧生成语义片段与证据候选。' },
    { stage: 'cloud', label: 'Qwen 交叉核验', detail: '演示数据回放：提取 6 条可验证主张并检查冲突。' },
  ],
};

export const demoEvidence: EvidenceItem = {
  id: 'ev-30day-control',
  title: '30 天对照实验',
  kind: 'data',
  excerpt: '30 天实验组节能 29.7%，对照组波动 1.8%，置信区间已记录。',
  source: '30-day-control.csv · 1,440 行',
  confidence: 0.98,
};
