import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { demoProject } from '../../data/demoProject';
import { AuditDashboard } from './AuditDashboard';
import { vi } from 'vitest';

describe('evidence cockpit', () => {
  it('shows the calculated score and every claim state', () => {
    render(<AuditDashboard initialAudit={demoProject} />);

    expect(screen.getByLabelText('证据健康度 68 分')).toBeVisible();
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

  it('raises the score above 80 only once after adding the 30 day evidence', async () => {
    render(<AuditDashboard initialAudit={demoProject} />);
    const action = screen.getByRole('button', { name: '补充 30 天对照实验' });

    await userEvent.click(action);
    expect(screen.getByLabelText('证据健康度 85 分')).toBeVisible();
    expect(action).toBeDisabled();
    expect(screen.getByRole('figure', { name: /与 3 条证据的关系图/ })).toHaveTextContent('30 天对照实验');
    expect(screen.getByRole('status')).toHaveTextContent('证据闭环');
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

    const evidenceFile = new File(['模型版本：Qwen3-4B INT4\n部署日期：2026-09-25'], '部署清单.md', { type: 'text/markdown' });
    await userEvent.upload(within(inspector).getByLabelText('按建议上传证据文件'), evidenceFile);
    expect(await within(inspector).findByText('找到证据啦')).toBeVisible();
    expect(within(inspector).getByText(/材料直接给出了模型版本/)).toBeVisible();
    expect(screen.getByRole('figure', { name: /与 1 条证据的关系图/ })).toHaveTextContent('部署清单.md');
    expect(screen.getByRole('figure', { name: /与 1 条证据的关系图/ })).toHaveTextContent('91%');
    expect(screen.getByText('OpenVINO 证据核验')).toBeVisible();

    await userEvent.click(within(inspector).getByRole('button', { name: '确认关系并完成审阅' }));
    expect(within(inspector).getByRole('heading', { name: '证据闭环' })).toBeVisible();
    expect(screen.getByText('人工确认关系')).toBeVisible();
    vi.unstubAllGlobals();
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
    expect(within(inspector).getByText(/report.pdf · P3/)).toBeVisible();
    expect(screen.getByText('Qwen 云端复核入档')).toBeVisible();
    vi.unstubAllGlobals();
  });
});
