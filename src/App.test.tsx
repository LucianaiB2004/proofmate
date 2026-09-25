import { render, screen } from '@testing-library/react';
import { App } from './App';

it('identifies the competition and technology on first render', () => {
  render(<App />);
  expect(screen.getByText('天猫 AI 黑客松作品 · Qwen × OpenVINO')).toBeVisible();
  expect(screen.getByRole('heading', { name: '每个结论，都能找到它的证据。' })).toBeVisible();
  expect(screen.getByText('你把答辩材料给我，我帮你找出里面站不住脚的结论和缺少的证据。')).toBeVisible();
  expect(screen.getByText(/档案编号/)).toBeInTheDocument();
  expect(screen.getByText('作者 LucianaiB')).toBeInTheDocument();
  expect(screen.queryByText(/真源/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '体验示例项目' })).toBeEnabled();
  expect(screen.getByRole('button', { name: /挑战者号发射决策/ })).toBeEnabled();
  expect(screen.getByRole('button', { name: /北京空气质量预测/ })).toBeEnabled();
  expect(screen.getByRole('button', { name: /AI 招聘系统审计/ })).toBeEnabled();
  expect(screen.getAllByText(/依据公开资料改编/)).toHaveLength(3);
});
