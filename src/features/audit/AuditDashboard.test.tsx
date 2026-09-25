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
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      json: async () => url.includes('local/status')
        ? { state: 'service_ready', model_state: 'ready' }
        : { state: 'service_ready', result: { summary: '部署记录缺少模型版本号' } },
    })));
    render(<AuditDashboard initialAudit={demoProject} />);
    await userEvent.click(screen.getByRole('button', { name: '使用端侧模型分析' }));
    await userEvent.click(await screen.findByRole('button', { name: '确认并加入档案' }));
    expect(screen.getByRole('button', { name: /部署记录缺少模型版本号/ })).toBeVisible();
    vi.unstubAllGlobals();
  });
});
