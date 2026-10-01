import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { demoProject } from './data/demoProject';

beforeEach(() => localStorage.clear());

it('identifies the four core technologies on first render', () => {
  render(<App />);
  expect(screen.getByText('TextIn xParse × Qwen × OpenVINO × 天猫 AI')).toBeVisible();
  expect(screen.getByRole('heading', { name: '每个结论，都能找到它的证据。' })).toBeVisible();
  expect(screen.getByText('你把答辩材料给我，我帮你找出里面站不住脚的结论和缺少的证据。')).toBeVisible();
  expect(screen.getByText(/档案编号/)).toBeInTheDocument();
  expect(screen.getByText('作者 LucianaiB')).toBeInTheDocument();
  expect(screen.queryByText(/真源/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '开始审查我的材料' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '查看案例展示' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '模型与 OCR 设置' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: /挑战者号发射决策/ })).not.toBeInTheDocument();
});

it('turns the hosted build into a cloud workspace with temporary provider settings', async () => {
  render(<App publicDemo />);

  expect(screen.getByText('GitHub Pages 云端体验版')).toBeVisible();
  expect(screen.getByRole('button', { name: '开始审查我的材料' })).toBeEnabled();
  expect(screen.getByLabelText(/选择项目材料/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '模型与 OCR 设置' }));
  expect(screen.getByRole('dialog', { name: '云端模型与 OCR 设置' })).toBeVisible();
  expect(screen.getByLabelText('百炼 API Key')).toBeInTheDocument();
});

it('pauses OCR uploads for TextIn settings and resumes without reselecting the file', async () => {
  render(<App publicDemo />);
  await userEvent.upload(screen.getByLabelText('选择项目材料'), new File(['pixels'], 'scan.jpg', { type: 'image/jpeg' }));
  expect(screen.getByRole('dialog', { name: '云端模型与 OCR 设置' })).toHaveTextContent('保存后会自动继续');
  await userEvent.type(screen.getByLabelText('TextIn App ID'), 'temporary-app');
  await userEvent.type(screen.getByLabelText('TextIn Secret Code'), 'temporary-secret');
  await userEvent.click(screen.getByRole('button', { name: '应用到本次页面' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '正在重建项目的证据链' })).toBeVisible();
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
  expect(screen.getByLabelText(/证据健康度 \d+ 分/)).toBeVisible();
  expect(screen.queryByLabelText('证据健康度 85 分')).not.toBeInTheDocument();
});
