import { render, screen } from '@testing-library/react';
import { App } from './App';

it('identifies the competition and technology on first render', () => {
  render(<App />);
  expect(screen.getByText('天猫 AI 黑客松作品 · Qwen × OpenVINO')).toBeVisible();
  expect(screen.getByRole('heading', { name: '每个结论，都能找到它的证据。' })).toBeVisible();
});
