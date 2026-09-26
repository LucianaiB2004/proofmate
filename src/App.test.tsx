import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { demoProject } from './data/demoProject';

beforeEach(() => localStorage.clear());

it('identifies the competition and technology on first render', () => {
  render(<App />);
  expect(screen.getByText('天猫 AI 黑客松作品 · Qwen × OpenVINO')).toBeVisible();
  expect(screen.getByRole('heading', { name: '每个结论，都能找到它的证据。' })).toBeVisible();
  expect(screen.getByText('你把答辩材料给我，我帮你找出里面站不住脚的结论和缺少的证据。')).toBeVisible();
  expect(screen.getByText(/档案编号/)).toBeInTheDocument();
  expect(screen.getByText('作者 LucianaiB')).toBeInTheDocument();
  expect(screen.queryByText(/真源/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '体验示例项目' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '查看案例展示' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: /挑战者号发射决策/ })).not.toBeInTheDocument();
});

it('opens the case gallery as a separate page and can return home', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: '查看案例展示' }));
  expect(screen.getByRole('heading', { name: '公开案例展示' })).toBeVisible();
  expect(screen.getByRole('button', { name: /挑战者号发射决策/ })).toBeEnabled();
  expect(screen.getAllByText(/依据公开资料改编/)).toHaveLength(3);
  expect(screen.getAllByRole('link', { name: /打开原始资料/ })).toHaveLength(4);
  await userEvent.click(screen.getByRole('button', { name: '返回首页' }));
  expect(screen.getByRole('heading', { name: '每个结论，都能找到它的证据。' })).toBeVisible();
});

it('offers to continue the last locally saved dossier', async () => {
  localStorage.setItem('proofmate:last-audit', JSON.stringify({ ...demoProject, name: '我的已保存项目', score: 85 }));

  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: '继续上次档案' }));

  expect(screen.getByRole('heading', { name: '我的已保存项目' })).toBeVisible();
  expect(screen.getByLabelText('证据健康度 85 分')).toBeVisible();
});
