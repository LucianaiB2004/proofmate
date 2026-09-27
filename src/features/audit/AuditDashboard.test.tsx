import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { demoProject } from '../../data/demoProject';
import { AuditDashboard } from './AuditDashboard';
import { vi } from 'vitest';

describe('evidence cockpit', () => {
  beforeEach(() => localStorage.clear());

  it('shows the calculated score and every claim state', () => {
    render(<AuditDashboard initialAudit={demoProject} />);

    expect(screen.getByLabelText(/证据健康度 \d+ 分/)).toBeVisible();
    expect(screen.getByText(/项目卷宗/)).toBeInTheDocument();
    expect(screen.getByText(/档案编号/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /证据审核章/ })).toBeInTheDocument();
    expect(screen.getByText('2 已证实')).toBeVisible();
    expect(screen.getByText('1 待补证')).toBeVisible();
    expect(screen.getByText('1 有冲突')).toBeVisible();
    expect(screen.getByText('2 缺证据')).toBeVisible();
  });

  it('opens a selected risk with source evidence and repair advice', async () => {
    render(<AuditDashboard initialAudit={demoProject} />);
    await userEvent.click(screen.getByRole('button', { name: /负荷预测模型准确率/ }));

    const inspector = screen.getByRole('region', { name: '风险检查器' });
    expect(within(inspector).getByText('验证集准确率 91.8%，F1 为 0.89。')).toBeVisible();
    expect(within(inspector).getByText(/统一指标口径/)).toBeVisible();
  });

  it('recalculates the score only once after adding the 30 day evidence', async () => {
    render(<AuditDashboard initialAudit={demoProject} />);
    const action = screen.getByRole('button', { name: '补充 30 天对照实验' });
    const before = Number(screen.getByRole('img', { name: /证据审核章/ }).querySelector('strong')?.textContent);

    await userEvent.click(action);
    const after = Number(screen.getByRole('img', { name: /证据审核章/ }).querySelector('strong')?.textContent);
    expect(after).toBeGreaterThan(before);
    expect(action).toBeDisabled();
    expect(screen.getByRole('figure', { name: /与 3 条证据的关系图/ })).toHaveTextContent('30 天对照实验');
    expect(screen.getByRole('status')).toHaveTextContent('证据闭环');
  });

  it('keeps an extracted real dossier usable before its first model review', () => {
    render(<AuditDashboard initialAudit={{ ...demoProject, id: 'import-empty', claims: [], evidence: demoProject.evidence.slice(0, 1) }} />);
    expect(screen.getByText('尚未生成可核验主张')).toBeVisible();
    expect(screen.getAllByText(/文件提取不是模型分析/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: '使用端侧模型分析' })).toBeEnabled();
  });

  it('automatically saves the reviewed dossier for a later visit', async () => {
    render(<AuditDashboard initialAudit={demoProject} />);

    await userEvent.click(screen.getByRole('button', { name: '补充 30 天对照实验' }));

    expect(screen.getByText('已自动保存')).toBeVisible();
    const saved = JSON.parse(String(localStorage.getItem('proofmate:last-audit'))) as typeof demoProject;
    expect(saved.score).toBe(Number(screen.getByRole('img', { name: /证据审核章/ }).querySelector('strong')?.textContent));
    expect(saved.evidence).toEqual(expect.arrayContaining([expect.objectContaining({ title: '30 天对照实验' })]));
  });

  it('adds a reviewer-confirmed OpenVINO finding as a traceable claim', async () => {
    const summary = [
      '【核心结论】部署记录包含模型版本号',
      '【证据依据】当前材料只写了模型名称',
      '【风险与边界】需要核验版本信息是否真实',
      '【下一步补证】上传部署清单或版本截图',
    ].join('\n');
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      json: async () => url.includes('local/status')
        ? { state: 'service_ready', model_state: 'ready' }
        : url.includes('local/evidence')
          ? { state: 'service_ready', result: { relation: 'support', excerpt: '模型版本：Qwen3-4B INT4', reason: '材料直接给出了模型版本', confidence: 0.91 } }
          : { state: 'service_ready', result: { summary } },
    })));
    render(<AuditDashboard initialAudit={demoProject} />);
    await userEvent.click(screen.getByRole('button', { name: '使用端侧模型分析' }));
    await userEvent.click(await screen.findByRole('button', { name: '确认并加入档案' }));
    await userEvent.click(screen.getByRole('button', { name: /部署记录包含模型版本号/ }));
    expect(screen.queryByRole('button', { name: /风险与边界/ })).not.toBeInTheDocument();
    const inspector = screen.getByRole('region', { name: '风险检查器' });
    expect(within(inspector).getByText('需要核验版本信息是否真实')).toBeVisible();
    expect(within(inspector).getByText('上传部署清单或版本截图')).toBeVisible();
    expect(within(inspector).getByText('定位提示 · 待判断')).toBeVisible();
    expect(within(inspector).getByText(/模型给出的定位提示/)).toBeVisible();
    expect(within(inspector).queryByRole('button', { name: '确认关系并完成审阅' })).not.toBeInTheDocument();
    expect(screen.getByRole('figure', { name: /与 1 条证据的关系图/ })).toHaveTextContent('OpenVINO 定位依据');
    expect(screen.getByRole('figure', { name: /与 1 条证据的关系图/ })).toHaveTextContent('当前材料只写了模型名称');
    expect(screen.getByRole('figure', { name: /与 1 条证据的关系图/ })).toHaveTextContent('为什么仍然缺证');

    const evidenceFile = new File(['模型版本：Qwen3-4B INT4\n部署日期：2026-09-25'], '部署清单.md', { type: 'text/markdown' });
    await userEvent.upload(within(inspector).getByLabelText('按建议上传证据文件'), evidenceFile);
    expect(await within(inspector).findByText('找到证据啦')).toBeVisible();
    expect(within(inspector).getAllByText(/材料直接给出了模型版本/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('figure', { name: /与 2 条证据的关系图/ })).toHaveTextContent('部署清单.md');
    expect(screen.getByRole('figure', { name: /与 2 条证据的关系图/ })).toHaveTextContent('91%');
    expect(screen.getByText('OpenVINO 证据核验')).toBeVisible();
    expect(screen.getByRole('heading', { name: '原始材料与提取结果' })).toBeVisible();
    expect(screen.getByText(/部署日期：2026-09-25/)).toBeVisible();

    await userEvent.click(within(inspector).getByRole('button', { name: '确认关系并完成审阅' }));
    expect(within(inspector).getByRole('heading', { name: '证据闭环' })).toBeVisible();
    expect(screen.getByText('人工确认关系')).toBeVisible();
    vi.unstubAllGlobals();
  });

  it('shows the original PDF entry, extracted text, and explains OCR in a source reader', async () => {
    const file = new File(['pdf bytes'], '答辩材料.pdf', { type: 'application/pdf' });
    const imported = {
      ...demoProject,
      id: 'import-reader',
      evidence: [{
        id: 'import-evidence-0',
        title: file.name,
        kind: 'document' as const,
        excerpt: '试点结果显示节能 18%。',
        content: '试点结果显示节能 18%。这里是 PDF.js 提取的完整正文。',
        extractionMethod: 'pdfjs' as const,
        source: file.name,
        confidence: 0.72,
      }],
      claims: [{ ...demoProject.claims[0], evidenceIds: ['import-evidence-0'] }],
    };
    render(<AuditDashboard initialAudit={imported} sourceFiles={[file]} />);

    expect(screen.getByRole('heading', { name: '原始材料与提取结果' })).toBeVisible();
    expect(screen.getByText('试点结果显示节能 18%。这里是 PDF.js 提取的完整正文。')).toBeVisible();
    expect(screen.getByText('OCR 的作用').parentElement).toHaveTextContent('图片或扫描件');
    expect(screen.getByText(/浏览器原文件预览/)).toBeVisible();
  });

  it('keeps unrelated uploads visible but blocks false evidence confirmation', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      json: async () => url.includes('local/evidence')
        ? { state: 'service_ready', result: { relation: 'unrelated', excerpt: '食堂满意度为 92%', reason: '内容与部署版本无关', confidence: 0.96 } }
        : { state: 'service_ready', model_state: 'ready' },
    })));
    render(<AuditDashboard initialAudit={demoProject} />);
    await userEvent.click(screen.getByRole('button', { name: /部署模型与评估模型版本完全一致/ }));
    const inspector = screen.getByRole('region', { name: '风险检查器' });
    await userEvent.upload(within(inspector).getByLabelText('按建议上传证据文件'), new File(['食堂满意度为 92%'], '满意度.txt', { type: 'text/plain' }));
    expect(await within(inspector).findByText(/不能用于证明当前主张/)).toBeVisible();
    expect(screen.getByRole('figure', { name: /与 2 条证据的关系图/ })).toHaveTextContent('无关');
    expect(within(inspector).queryByRole('button', { name: '确认关系并完成审阅' })).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('keeps a failed OCR upload visible as an unreviewed material', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('local/status')) return { json: async () => ({ state: 'service_ready', model_state: 'ready' }) };
      if (url.includes('xparse/parse')) return { ok: false, json: async () => ({ message: 'OCR 服务暂不可用' }) };
      return { json: async () => ({ state: 'service_ready' }) };
    }));
    render(<AuditDashboard initialAudit={demoProject} />);
    await userEvent.click(screen.getByRole('button', { name: /部署模型与评估模型版本完全一致/ }));
    const inspector = screen.getByRole('region', { name: '风险检查器' });
    await userEvent.upload(within(inspector).getByLabelText('按建议上传证据文件'), new File(['pixels'], '版本截图.png', { type: 'image/png' }));

    expect(await within(inspector).findByText('等待人工判断')).toBeVisible();
    expect(screen.getByRole('figure', { name: /与 2 条证据的关系图/ })).toHaveTextContent('版本截图.png');
    expect(screen.getByRole('figure', { name: /与 2 条证据的关系图/ })).toHaveTextContent('OCR 服务暂不可用');
    vi.unstubAllGlobals();
  });

  it('checks several materials and ranks the strongest support first', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, options?: RequestInit) => {
      const body = JSON.parse(String(options?.body ?? '{}')) as { source?: string };
      const isSupport = body.source === '版本清单.md';
      return {
        json: async () => ({ state: 'service_ready', result: isSupport
          ? { relation: 'support', excerpt: '模型版本 Qwen3-4B INT4', reason: '直接给出版本号', confidence: 0.94 }
          : { relation: 'unrelated', excerpt: '食堂满意度 92%', reason: '与模型版本无关', confidence: 0.99 } }),
      };
    }));
    render(<AuditDashboard initialAudit={demoProject} />);
    await userEvent.click(screen.getByRole('button', { name: /传感数据全程不包含可识别个人信息/ }));
    const inspector = screen.getByRole('region', { name: '风险检查器' });
    await userEvent.upload(within(inspector).getByLabelText('按建议上传证据文件'), [
      new File(['食堂满意度 92%'], '满意度.txt', { type: 'text/plain' }),
      new File(['模型版本 Qwen3-4B INT4'], '版本清单.md', { type: 'text/markdown' }),
    ]);

    expect(await within(inspector).findByText('批量核验完成')).toBeVisible();
    expect(within(inspector).getByText(/2 份材料中：1 份支持.*1 份无关/)).toBeVisible();
    const cards = screen.getByRole('figure', { name: /与 4 条证据的关系图/ }).querySelectorAll('.evidence-card');
    expect(cards[0]).toHaveTextContent('版本清单.md');
    expect(cards[cards.length - 1]).toHaveTextContent('满意度.txt');
    expect(within(inspector).getByRole('button', { name: '确认关系并完成审阅' })).toBeVisible();
    vi.unstubAllGlobals();
  });

  it('turns reviewer-confirmed Qwen findings into linked claims and evidence', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      json: async () => url.includes('local/status')
        ? { state: 'service_ready', model_state: 'ready' }
        : { state: 'provider_ready', claims: [{ statement: '试点节能 18%', risk: '周期过短', repair: '补充对照实验', source: 'report.pdf · P3', excerpt: '试点节能 18%' }] },
    })));
    render(<AuditDashboard initialAudit={demoProject} />);
    await userEvent.click(screen.getByRole('button', { name: '检测并分析当前材料' }));
    await userEvent.click(await screen.findByRole('button', { name: '确认 1 条云端发现并加入档案' }));
    await userEvent.click(screen.getByRole('button', { name: /试点节能 18%/ }));
    const inspector = screen.getByRole('region', { name: '风险检查器' });
    expect(within(inspector).getByText('试点节能 18%', { selector: 'blockquote' })).toBeVisible();
    expect(within(inspector).getAllByText(/report.pdf · P3/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Qwen 云端复核入档')).toBeVisible();
    vi.unstubAllGlobals();
  });

  it('requires a person to classify a source-matched cloud quote before it contributes to the score', async () => {
    const source = {
      id: 'source', title: '部署清单.md', kind: 'document' as const, source: '部署清单.md',
      sourceFingerprint: 'deployment-file', extractionMethod: 'browser-text' as const,
      content: '模型版本：Qwen3-4B INT4。', excerpt: '模型版本：Qwen3-4B INT4。', confidence: .8,
    };
    const imported = {
      ...demoProject, id: 'import-review-flow', evidence: [source],
      claims: [{ id: 'claim-version-real', statement: '部署记录包含模型版本号', importance: 'high' as const, status: 'missing' as const, evidenceIds: [], risk: '待核对', repair: '查部署清单' }],
    };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      json: async () => url.includes('local/status') ? { state: 'service_ready', model_state: 'ready' }
        : { state: 'provider_ready', claims: [{ statement: '部署记录包含模型版本号', risk: '还需人工确认', repair: '核对部署清单', source: '部署清单.md', excerpt: '模型版本：Qwen3-4B INT4。' }] },
    })));
    render(<AuditDashboard initialAudit={imported} />);
    await userEvent.click(screen.getByRole('button', { name: '复核 1 条未解决主张' }));
    await userEvent.click(await screen.findByRole('button', { name: '确认 1 条云端发现并加入档案' }));
    const inspector = screen.getByRole('region', { name: '风险检查器' });
    expect(screen.getByLabelText('证据健康度 0 分')).toBeVisible();
    expect(screen.getByRole('figure', { name: /与 1 条证据的关系图/ })).toHaveTextContent('待判断');
    await userEvent.click(within(inspector).getByRole('button', { name: '确认支持' }));
    const candidateScore = Number(screen.getByRole('img', { name: /证据审核章/ }).querySelector('strong')?.textContent);
    expect(candidateScore).toBeGreaterThan(0);
    expect(screen.getByRole('figure', { name: /与 1 条证据的关系图/ })).toHaveTextContent('人工已核对');
    expect(within(inspector).getByRole('button', { name: '确认关系并完成审阅' })).toBeVisible();
    await userEvent.click(within(inspector).getByRole('button', { name: '确认关系并完成审阅' }));
    expect(Number(screen.getByRole('img', { name: /证据审核章/ }).querySelector('strong')?.textContent)).toBeGreaterThan(candidateScore);
    vi.unstubAllGlobals();
  });

  it('lets the reviewer mark a matched quotation as conflicting without granting support points', async () => {
    const excerpt = '2026-09-25 实测结果只有 3%。';
    const imported = {
      ...demoProject, id: 'import-conflict-flow',
      evidence: [
        { id: 'source', title: '复算.txt', kind: 'document' as const, source: '复算.txt', sourceFingerprint: 'file-1', extractionMethod: 'browser-text' as const, content: excerpt, excerpt, confidence: .8 },
        { id: 'quote', title: '复算.txt · 原文', kind: 'document' as const, source: '复算.txt', sourceFingerprint: 'file-1', excerpt, relation: 'unreviewed' as const, confidence: .45 },
      ],
      claims: [{ id: 'claim-energy-real', statement: '能耗下降 31%', importance: 'high' as const, status: 'missing' as const, evidenceIds: ['quote'], risk: '数据不一致', repair: '复算' }],
    };
    render(<AuditDashboard initialAudit={imported} />);
    const inspector = screen.getByRole('region', { name: '风险检查器' });
    await userEvent.click(within(inspector).getByRole('button', { name: '标记冲突' }));
    expect(screen.getByText('1 有冲突')).toBeVisible();
    expect(screen.getByLabelText('证据健康度 0 分')).toBeVisible();
    expect(screen.getByRole('figure', { name: /与 1 条证据的关系图/ })).toHaveTextContent('人工已核对');
  });

  it('does not offer final confirmation for a legacy support label whose quote is absent from the file', () => {
    const imported = {
      ...demoProject, id: 'import-legacy-support',
      evidence: [
        { id: 'source', title: '材料.txt', kind: 'document' as const, source: '材料.txt', extractionMethod: 'browser-text' as const, content: '原文只写了待审事项。', excerpt: '原文只写了待审事项。', confidence: .8 },
        { id: 'false-support', title: '虚构摘录', kind: 'document' as const, source: '材料.txt', excerpt: '不存在的实测结果', relation: 'support' as const, confidence: .9 },
      ],
      claims: [{ id: 'claim-legacy', statement: '模型已完成实测', importance: 'high' as const, status: 'weak' as const, evidenceIds: ['false-support'], risk: '待核查', repair: '核对原文' }],
    };
    render(<AuditDashboard initialAudit={imported} />);
    expect(within(screen.getByRole('region', { name: '风险检查器' })).queryByRole('button', { name: '确认关系并完成审阅' })).not.toBeInTheDocument();
  });
});
