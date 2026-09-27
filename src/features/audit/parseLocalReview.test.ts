import { describe, expect, it } from 'vitest';
import { parseLocalReview, parseLocalReviews } from './parseLocalReview';

describe('parseLocalReview', () => {
  it('separates the four review sections instead of storing the whole response as one claim', () => {
    const parsed = parseLocalReview([
      '【核心结论】部署记录缺少模型版本号',
      '【证据依据】当前材料只写了模型名称',
      '【风险与边界】无法复现实验环境',
      '【下一步补证】上传部署清单或版本截图',
    ].join('\n'));

    expect(parsed).toEqual({
      statement: '部署记录缺少模型版本号',
      basis: '当前材料只写了模型名称',
      risk: '无法复现实验环境',
      repair: '上传部署清单或版本截图',
    });
  });

  it('keeps a useful fallback for an unstructured local response', () => {
    expect(parseLocalReview('部署记录缺少模型版本号')).toMatchObject({
      statement: '部署记录缺少模型版本号',
    });
  });

  it('turns a numbered model review into separate, aligned findings', () => {
    const findings = parseLocalReviews([
      '【核心结论】',
      '1. 能耗降幅缺少因果证据',
      '2. 部署记录缺少版本号',
      '【证据依据】',
      '- 只有七天数据',
      '- 只有模型名称',
      '【风险与边界】',
      '- 天气可能影响结果',
      '- 环境无法复现',
      '【下一步补证】',
      '1. 上传同期对照数据',
      '2. 上传部署清单',
    ].join('\n'));

    expect(findings).toHaveLength(2);
    expect(findings[1]).toEqual({ statement: '部署记录缺少版本号', basis: '只有模型名称', risk: '环境无法复现', repair: '上传部署清单' });
  });

  it('splits inline numbered conclusions into distinct claims with their own basis and repair', () => {
    const findings = parseLocalReviews([
      '【核心结论】1. 低温下 O 形环密封性能未被验证；2. 项目组未提供发射当日温度数据；3. 未见工程师书面建议及风险签收记录。',
      '【证据依据】1. 测试记录没有低温数据；2. 发射日温度不在材料中；3. 仅有口头讨论。',
      '【风险与边界】1. 密封性能无法外推；2. 当日条件不可核对；3. 决策过程不可追溯。',
      '【下一步补证】1. 查低温实验；2. 提供发射日温度；3. 提供书面签收记录。',
    ].join('\n'));

    expect(findings.map((finding) => finding.statement)).toEqual([
      '低温下 O 形环密封性能未被验证',
      '项目组未提供发射当日温度数据',
      '未见工程师书面建议及风险签收记录。',
    ]);
    expect(findings.map((finding) => finding.basis)).toEqual(['测试记录没有低温数据', '发射日温度不在材料中', '仅有口头讨论。']);
    expect(findings[2].repair).toBe('提供书面签收记录。');
  });

  it('cleans Markdown and HTML and rejects markup-only findings', () => {
    const findings = parseLocalReviews([
      '【核心结论】',
      '1. ## 部署记录包含模型版本号。',
      '2. <table><tr></tr></table>',
      '【证据依据】',
      '- <td>模型版本：Qwen3-4B INT4</td>',
      '【风险与边界】尚未记录哈希',
      '【下一步补证】补充 SHA256',
    ].join('\n'));

    expect(findings).toHaveLength(1);
    expect(findings[0].statement).toBe('部署记录包含模型版本号。');
    expect(findings[0].basis).toBe('模型版本：Qwen3-4B INT4');
  });
});
