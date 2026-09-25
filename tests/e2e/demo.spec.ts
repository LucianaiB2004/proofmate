import { expect, test } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';

test('completes the evidence repair story and exports the report', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '每个结论，都能找到它的证据。' })).toBeVisible();
  await expect(page.getByText('作者 LucianaiB')).toBeVisible();
  await expect(page.getByText(/档案编号 TM-AI-2026/)).toBeVisible();
  await page.getByRole('button', { name: '体验示例项目' }).click();
  await expect(page.getByRole('heading', { name: '正在重建项目的证据链' })).toBeVisible();
  await expect(page.getByText('材料清点仪')).toBeVisible();
  await expect(page.getByText('隐私检查仪')).toBeVisible();
  await expect(page.getByText('模型核验仪')).toBeVisible();
  await expect(page.getByLabel('证据健康度 68 分')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole('img', { name: /证据审核章/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: '本地分析仪' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '云端复核仪' })).toBeVisible();
  await page.getByRole('button', { name: '补充 30 天对照实验' }).click();
  await expect(page.getByLabel('证据健康度 85 分')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('证据闭环');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出答辩摘要' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('可信答辩摘要.md');
});

test('keeps mobile navigation usable without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const longName = `${'毕业设计证据材料'.repeat(12)}.txt`;
  await page.locator('input[type=file]').setInputFiles({ name: longName, mimeType: 'text/plain', buffer: Buffer.from('真实材料用于移动端溢出检查') });
  await expect(page.getByRole('heading', { name: /我的材料/ })).toBeVisible({ timeout: 7000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const importExportBox = await page.getByRole('button', { name: '导出答辩摘要' }).boundingBox();
  expect(importExportBox).not.toBeNull();
  expect(importExportBox!.x + importExportBox!.width).toBeLessThanOrEqual(390);
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

test('stops decorative scanning and stamp animations for reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button', { name: '体验示例项目' }).click();
  await expect(page.locator('.scanner-line')).toBeVisible();
  expect(await page.locator('.scanner-line').evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
  await expect(page.getByLabel('证据健康度 68 分')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: '补充 30 天对照实验' }).click();
  expect(await page.getByRole('status').evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
  await context.close();
});

test('extracts real PDF text in the browser without substituting demo data', async ({ page }) => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const sheet = pdf.addPage();
  sheet.drawText('Pilot evidence shows energy reduction of 18 percent.', { x: 50, y: 700, font, size: 14 });
  const bytes = await pdf.save();

  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({ name: 'real-evidence.pdf', mimeType: 'application/pdf', buffer: Buffer.from(bytes) });
  await expect(page.getByRole('heading', { name: /我的材料 · real-evidence.pdf/ })).toBeVisible({ timeout: 7000 });
  await expect(page.getByText(/Pilot evidence shows energy reduction of 18 percent/).first()).toBeVisible();
});

test('carries the local AI result through the Vite proxy into the product UI', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '体验示例项目' }).click();
  await expect(page.getByLabel('证据健康度 68 分')).toBeVisible({ timeout: 7000 });
  await expect(page.getByText('OpenVINO · service_ready')).toBeVisible();
  await page.getByRole('button', { name: '使用端侧模型分析' }).click();
  const result = page.getByText(/代理链路返回的端侧证据结论/);
  await expect(result).toBeVisible();
  expect(await result.evaluate((node) => getComputedStyle(node).color)).toBe('rgb(23, 23, 23)');
});
