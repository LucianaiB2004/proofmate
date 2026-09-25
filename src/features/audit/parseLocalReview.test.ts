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
});
