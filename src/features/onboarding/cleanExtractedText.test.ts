import { cleanExtractedText, segmentExtractedText } from './cleanExtractedText';

it('turns Markdown headings and HTML table cells into readable text', () => {
  const input = '# 挑战者号发射决策复盘\n\n## 待审查案例材料\n<table border="1"><tr><td>测试目标</td><td>验证 PDF 提取</td></tr></table>';
  const cleaned = cleanExtractedText(input);

  expect(cleaned).toContain('挑战者号发射决策复盘');
  expect(cleaned).toContain('待审查案例材料');
  expect(cleaned).toContain('测试目标');
  expect(cleaned).toContain('验证 PDF 提取');
  expect(cleaned).not.toMatch(/#|<\/?(?:table|tr|td)\b/i);
});

it('creates independently located and fingerprinted source fragments', () => {
  const fragments = segmentExtractedText(
    '第一段说明低温会增加 O 型环风险。\n\n第二段说明工程师建议不要发射。',
    '挑战者号案例.pdf',
    'evidence-1',
  );

  expect(fragments).toHaveLength(2);
  expect(fragments.map((item) => item.locator)).toEqual(['段落 1', '段落 2']);
  expect(new Set(fragments.map((item) => item.fingerprint)).size).toBe(2);
  expect(fragments.every((item) => item.evidenceId === 'evidence-1' && item.source === '挑战者号案例.pdf')).toBe(true);
});

it('decodes common entities and discards non-claims shorter than eight characters', () => {
  expect(cleanExtractedText('风险&amp;收益&nbsp;对照')).toBe('风险&收益 对照');
  expect(segmentExtractedText('短句\n\n这是一个足够长的可定位材料片段。', '材料.md', 'ev')).toHaveLength(1);
});
