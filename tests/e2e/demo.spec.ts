import { expect, test } from '@playwright/test';

test('completes the evidence repair story and exports the report', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '每个结论，都能找到它的证据。' })).toBeVisible();
  await page.getByRole('button', { name: '体验示例项目' }).click();
  await expect(page.getByRole('heading', { name: '正在重建项目的证据链' })).toBeVisible();
  await expect(page.getByLabel('证据健康度 68 分')).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: '补充 30 天对照实验' }).click();
  await expect(page.getByLabel('证据健康度 85 分')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出答辩摘要' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('可信答辩摘要.md');
});

test('keeps mobile navigation usable without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '体验示例项目' }).click();
  await expect(page.getByLabel('证据健康度 68 分')).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: /负荷预测模型准确率/ }).click();
  await expect(page.getByRole('region', { name: '风险检查器' })).toBeVisible();
  const exportBox = await page.getByRole('button', { name: '导出答辩摘要' }).boundingBox();
  expect(exportBox).not.toBeNull();
  expect(exportBox!.width).toBeGreaterThan(exportBox!.height * 2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
