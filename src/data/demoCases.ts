import type { ProjectAudit } from '../domain/types';
import { demoProject } from './demoProject';

export interface DemoCase {
  id: string;
  shortName: string;
  focus: string;
  provenance: string;
  sourceLabel: string;
  sourceUrl: string;
  project: ProjectAudit;
}

const challenger: ProjectAudit = {
  id: 'public-challenger-demo', name: '挑战者号发射决策复盘', score: 52,
  dimensions: { coverage: 58, consistency: 46, freshness: 42, reproducibility: 62 },
  evidence: [
    { id: 'ch-report', title: '总统委员会调查结论', kind: 'document', excerpt: '委员会认为发射决策存在缺陷，关键决策者没有掌握 O 型环问题的完整历史。', source: 'Rogers Commission · Chapter V', confidence: .99 },
    { id: 'ch-temp', title: '低温发射建议', kind: 'document', excerpt: '承包商最初建议不要在低于 53°F 的条件下发射。', source: 'Rogers Commission · Vol. 1', confidence: .98 },
    { id: 'ch-history', title: '既往侵蚀记录', kind: 'log', excerpt: '此前飞行中已经多次记录 O 型环侵蚀与吹蚀现象。', source: 'NASA History · Chapter VI', confidence: .96 },
    { id: 'ch-review', title: '管理评审记录', kind: 'document', excerpt: '工程警告在管理判断中被弱化，信息没有完整传递到关键层级。', source: 'Rogers Commission · Findings', confidence: .97 },
  ],
  claims: [
    { id: 'ch-safe', statement: '现有证据足以支持低温条件下发射', status: 'conflict', importance: 'critical', evidenceIds: ['ch-temp', 'ch-history'], risk: '工程建议与发射结论直接冲突。', repair: '把温度、历史侵蚀记录和工程师意见放进同一决策证据包。' },
    { id: 'ch-informed', statement: '关键决策者掌握了全部 O 型环风险', status: 'conflict', importance: 'critical', evidenceIds: ['ch-report', 'ch-review'], risk: '调查报告明确指出信息传递不完整。', repair: '建立风险签收记录，证明每位决策者实际看到过哪些材料。' },
    { id: 'ch-process', statement: '发射准备评审完整覆盖了关键异常', status: 'weak', importance: 'high', evidenceIds: ['ch-review'], risk: '异常虽然存在记录，但没有形成清晰的升级与关闭证据。', repair: '补齐异常升级、责任人、处置决定和关闭依据。' },
  ],
  trace: [{ stage: 'device', label: '公开报告切片', detail: '从 NASA 公开调查材料整理关键主张。' }, { stage: 'cloud', label: '冲突关系核验', detail: '对照工程意见、历史记录与最终决策。' }],
};

const airQuality: ProjectAudit = {
  id: 'public-air-quality-demo', name: '北京空气质量预测研究', score: 64,
  dimensions: { coverage: 70, consistency: 65, freshness: 55, reproducibility: 66 },
  evidence: [
    { id: 'aq-meta', title: 'UCI 数据集说明', kind: 'document', excerpt: '数据覆盖 12 个监测站、6 种污染物和6类气象变量。', source: 'UCI Dataset 501', confidence: .99 },
    { id: 'aq-range', title: '数据时间范围', kind: 'data', excerpt: '记录时间为 2013-03-01 至 2017-02-28。', source: 'UCI Metadata · Time period', confidence: .99 },
    { id: 'aq-missing', title: '缺失值说明', kind: 'data', excerpt: '数据集明确包含以 NA 标记的缺失数据。', source: 'UCI Metadata · Missing values', confidence: .99 },
    { id: 'aq-sites', title: '监测站范围', kind: 'data', excerpt: '空气质量来自北京市 12 个国家控制监测站。', source: 'UCI Dataset Information', confidence: .98 },
  ],
  claims: [
    { id: 'aq-current', statement: '模型可以直接代表当前北京空气质量', status: 'conflict', importance: 'critical', evidenceIds: ['aq-range'], risk: '公开数据截至 2017 年，不能直接证明当前表现。', repair: '补充近期数据，并按时间外测试集重新评估。' },
    { id: 'aq-complete', statement: '训练数据不存在缺失值', status: 'conflict', importance: 'high', evidenceIds: ['aq-missing'], risk: '数据说明明确标记存在 NA。', repair: '公开缺失值比例、填补方法和敏感性分析。' },
    { id: 'aq-citywide', statement: '12 个站点足以代表所有城市微环境', status: 'weak', importance: 'high', evidenceIds: ['aq-sites', 'aq-meta'], risk: '监测站覆盖不等于所有街区与微环境均被代表。', repair: '说明空间外推边界，并进行留站验证。' },
  ],
  trace: [{ stage: 'device', label: '元数据清点', detail: '本地读取字段、时间范围与缺失值声明。' }, { stage: 'cloud', label: '外推风险复核', detail: '检查结论是否超出数据覆盖范围。' }],
};

const hiring: ProjectAudit = {
  id: 'public-ai-hiring-demo', name: 'AI 招聘系统风险审计', score: 59,
  dimensions: { coverage: 62, consistency: 58, freshness: 68, reproducibility: 48 },
  evidence: [
    { id: 'hr-rmf', title: 'NIST AI RMF 核心框架', kind: 'document', excerpt: 'AI 风险管理应持续执行 Govern、Map、Measure、Manage。', source: 'NIST AI RMF 1.0', confidence: .99 },
    { id: 'hr-fair', title: '公平性评估要求', kind: 'document', excerpt: '公平性和偏差风险应被评估并记录结果。', source: 'NIST AI RMF · Measure 2.11', confidence: .99 },
    { id: 'hr-privacy', title: '隐私风险要求', kind: 'document', excerpt: '系统的隐私风险应被检查并形成文档。', source: 'NIST AI RMF · Measure 2.10', confidence: .99 },
    { id: 'hr-monitor', title: '持续风险跟踪要求', kind: 'document', excerpt: '应建立机制持续跟踪已知、意外和新出现的风险。', source: 'NIST AI RMF · Measure 3.1', confidence: .98 },
  ],
  claims: [
    { id: 'hr-accurate', statement: '整体准确率高就能证明招聘系统公平', status: 'conflict', importance: 'critical', evidenceIds: ['hr-fair'], risk: '整体准确率不能替代分群公平性与偏差评估。', repair: '按相关群体报告错误率、选择率和不确定性。' },
    { id: 'hr-private', statement: '候选人隐私风险已经得到充分控制', status: 'missing', importance: 'critical', evidenceIds: ['hr-privacy'], risk: '只有框架要求，没有项目自己的数据流和隐私评估。', repair: '补充字段清单、保存周期、访问权限和隐私影响评估。' },
    { id: 'hr-stable', statement: '上线前测试通过即可长期稳定使用', status: 'weak', importance: 'high', evidenceIds: ['hr-monitor', 'hr-rmf'], risk: '部署后人群、岗位和数据分布可能变化。', repair: '建立部署监测、申诉通道与定期复审证据。' },
  ],
  trace: [{ stage: 'device', label: '政策材料索引', detail: '端侧定位公平、隐私和监测要求。' }, { stage: 'cloud', label: '项目证据映射', detail: '把系统主张映射到 NIST 风险管理结果。' }],
};

export const demoCases: DemoCase[] = [
  { id: 'campus', shortName: '校园节能项目', focus: '数字冲突 · 补证闭环', provenance: '项目原创样例', sourceLabel: 'ProofMate 原创材料', sourceUrl: 'https://github.com/LucianaiB2004/proofmate', project: demoProject },
  { id: 'challenger', shortName: '挑战者号发射决策', focus: '工程警告 · 决策断链', provenance: '依据公开资料改编', sourceLabel: 'NASA Rogers Commission', sourceUrl: 'https://sma.nasa.gov/SignificantIncidents/assets/rogers_commission_report.pdf', project: challenger },
  { id: 'air-quality', shortName: '北京空气质量预测', focus: '数据时效 · 缺失值 · 外推', provenance: '依据公开资料改编', sourceLabel: 'UCI Dataset 501 · CC BY 4.0', sourceUrl: 'https://archive.ics.uci.edu/dataset/501/beijing', project: airQuality },
  { id: 'ai-hiring', shortName: 'AI 招聘系统审计', focus: '公平性 · 隐私 · 持续监测', provenance: '依据公开资料改编', sourceLabel: 'NIST AI RMF', sourceUrl: 'https://airc.nist.gov/airmf-resources/usecases/', project: hiring },
];
