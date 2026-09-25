import { render, screen } from '@testing-library/react';
import { App } from './App';

it('identifies the competition and technology on first render', () => {
  render(<App />);
  expect(screen.getByText('天猫 AI 黑客松作品 · Qwen × OpenVINO')).toBeVisible();
  expect(screen.getByRole('heading', { name: '每个结论，都能找到它的证据。' })).toBeVisible();
  expect(screen.getByText(/档案编号/)).toBeInTheDocument();
  expect(screen.getByText('学生作品')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '体验示例项目' })).toBeEnabled();
});
