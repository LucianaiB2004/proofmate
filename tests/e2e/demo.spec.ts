import { expect, test } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';

async function openCampusCase(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '查看案例展示' }).click();
  await page.getByRole('button', { name: '打开 校园节能项目' }).click();
}

test('completes the evidence repair story and exports the report', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '每个结论，都能找到它的证据。' })).toBeVisible();
  await expect(page.getByText('作者 LucianaiB')).toBeVisible();
  await expect(page.getByText(/档案编号 TM-AI-2026/)).toBeVisible();
  await openCampusCase(page);
  await expect(page.getByRole('heading', { name: '正在重建项目的证据链' })).toBeVisible();
  await expect(page.getByText('材料清点仪')).toBeVisible();
  await expect(page.getByText('隐私检查仪')).toBeVisible();
  await expect(page.getByText('模型核验仪')).toBeVisible();
  await expect(page.getByLabel(/证据健康度 \d+ 分/)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole('img', { name: /证据审核章/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: '本地分析仪' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '云端复核仪' })).toBeVisible();
  const scoreBeforeRepair = Number(await page.locator('.score-ring strong').textContent());
  await page.getByRole('button', { name: '补充 30 天对照实验' }).click();
  await expect.poll(async () => Number(await page.locator('.score-ring strong').textContent())).toBeGreaterThan(scoreBeforeRepair);
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
  await openCampusCase(page);
  await expect(page.getByLabel(/证据健康度 \d+ 分/)).toBeVisible({ timeout: 5_000 });
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
  await openCampusCase(page);
  await expect(page.locator('.scanner-line')).toBeVisible();
  expect(await page.locator('.scanner-line').evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
  await expect(page.getByLabel(/证据健康度 \d+ 分/)).toBeVisible({ timeout: 5000 });
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
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '开始审查我的材料' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: 'real-evidence.pdf', mimeType: 'application/pdf', buffer: Buffer.from(bytes) });
  await expect(page.getByRole('heading', { name: /我的材料 · real-evidence.pdf/ })).toBeVisible({ timeout: 7000 });
  await expect(page.getByText(/Pilot evidence shows energy reduction of 18 percent/).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: '原始材料与提取结果' })).toBeVisible();
  await expect(page.getByText('OCR 的作用')).toBeVisible();
  await expect(page.locator('.original-preview iframe')).toBeVisible();
  await expect(page.getByRole('link', { name: '在新窗口打开 PDF' })).toBeVisible();
});

test('opens the case gallery and runs a selected public case', async ({ page }) => {
  await page.goto('/?e2e=cases');
  await page.getByRole('button', { name: '查看案例展示' }).click();
  await expect(page.getByRole('heading', { name: '公开案例展示' })).toBeVisible();
  await expect(page.getByRole('region', { name: '公开案例列表' })).toContainText('挑战者号发射决策');
  await page.getByRole('button', { name: '打开 挑战者号发射决策' }).click();
  await expect(page.getByRole('heading', { name: '正在重建项目的证据链' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '挑战者号发射决策复盘' })).toBeVisible({ timeout: 7000 });
});

test('falls back to xParse for an image-only scanned PDF and shows the OCR result', async ({ page }) => {
  await page.route('**/api/xparse/parse', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ state: 'provider_ready', text: '扫描证明材料：模型版本 Qwen3-4B INT4' }),
  }));
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const bytes = await pdf.save();

  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({ name: 'scan.pdf', mimeType: 'application/pdf', buffer: Buffer.from(bytes) });

  await expect(page.getByRole('heading', { name: /我的材料 · scan.pdf/ })).toBeVisible({ timeout: 7000 });
  await expect(page.locator('.extraction-result pre')).toHaveText('扫描证明材料：模型版本 Qwen3-4B INT4');
  await expect(page.getByRole('region', { name: '原始材料与提取结果' }).locator('b')).toHaveText('TextIn xParse OCR');
});

test('carries the local AI result through the Vite proxy into the product UI', async ({ page }) => {
  await page.goto('/');
  await openCampusCase(page);
  await expect(page.getByLabel(/证据健康度 \d+ 分/)).toBeVisible({ timeout: 7000 });
  await expect(page.getByText('OpenVINO · service_ready')).toBeVisible();
  await page.getByRole('button', { name: '使用端侧模型分析' }).click();
  const result = page.getByText(/代理链路返回的端侧证据结论/);
  await expect(result).toBeVisible();
  expect(await result.evaluate((node) => getComputedStyle(node).color)).toBe('rgb(23, 23, 23)');
});

test('convergent real-material review stays readable and idempotent', async ({ page }) => {
  await page.route('**/api/local/analyze', async (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ state: 'service_ready', result: { summary: '【核心结论】1. 代理链路返回的端侧证据结论。\n【证据依据】1. Pilot evidence shows energy reduction of 18 percent.\n【风险与边界】1. 需要补充来源。\n【下一步补证】1. 核对 PDF 原文。' } }),
  }));
  let cloudReviewInput = '';
  await page.route('**/api/qwen/analyze', async (route) => {
    cloudReviewInput = (route.request().postDataJSON() as { text: string }).text;
    await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ state: 'provider_ready', claims: [{
      statement: '代理链路返回的端侧证据结论。',
      risk: '当前只有一段端侧定位结果，需要补充来源。',
      repair: '补充带页码的原始材料。',
      source: 'review.pdf · P1',
      excerpt: 'Pilot evidence shows energy reduction of 18 percent.',
    }] }),
  });
  });
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const sheet = pdf.addPage();
  sheet.drawText('# Launch review', { x: 50, y: 730, font, size: 12 });
  sheet.drawText('<table><tr><td>Test target</td><td>PDF extraction</td></tr></table>', { x: 50, y: 700, font, size: 10 });
  sheet.drawText('Pilot evidence shows energy reduction of 18 percent.', { x: 50, y: 670, font, size: 12 });
  const bytes = await pdf.save();

  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({ name: 'review.pdf', mimeType: 'application/pdf', buffer: Buffer.from(bytes) });
  await expect(page.getByRole('heading', { name: '尚未生成可核验主张' })).toBeVisible({ timeout: 7000 });
  await expect(page.locator('.claim-list .claim-item')).toHaveCount(0);

  await page.getByRole('button', { name: '使用端侧模型分析' }).click();
  await page.getByRole('button', { name: '确认并加入档案' }).click();
  await expect(page.locator('.claim-list .claim-item')).toHaveCount(1);
  await expect(page.locator('.claim-list')).not.toContainText('<table>');

  await page.getByRole('button', { name: '使用端侧模型分析' }).click();
  await page.getByRole('button', { name: '确认并加入档案' }).click();
  await expect(page.getByTestId('human-review-slip')).toContainText('本轮无新增变化');
  await expect(page.locator('.claim-list .claim-item')).toHaveCount(1);

  await page.getByRole('button', { name: '复核 1 条未解决主张' }).click();
  expect(cloudReviewInput).toContain('【上传原文】');
  expect(cloudReviewInput).toContain('Pilot evidence shows energy reduction of 18 percent.');
  await page.getByRole('button', { name: '确认 1 条云端发现并加入档案' }).click();
  await expect(page.locator('.claim-list .claim-item')).toHaveCount(1);
  await expect(page.getByTestId('human-review-slip')).toContainText('剩余 1 条待复核');
  await expect(page.getByRole('figure', { name: /与 2 条证据的关系图/ })).toContainText('review.pdf');

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.getByRole('heading', { name: '证据关系板' })).toBeVisible();
});

test('shows three inline OpenVINO findings as separate selectable relationships with an explained zero score', async ({ page }) => {
  await page.route('**/api/local/analyze', async (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ state: 'service_ready', result: { summary: [
      '【核心结论】1. 低温密封性能未验证；2. 发射当日温度缺失；3. 工程师书面意见缺失。',
      '【证据依据】1. 材料只有项目组结论；2. 材料没有温度记录；3. 材料没有签收记录。',
      '【风险与边界】1. 不能外推低温可靠性；2. 不能核对当日条件；3. 不能核对意见流转。',
      '【下一步补证】1. 补充低温测试；2. 补充当日温度；3. 补充书面签收。',
    ].join('\n') } }),
  }));
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({ name: 'decision.txt', mimeType: 'text/plain', buffer: Buffer.from('项目组认为低温密封可靠，但材料没有温度记录或签收记录。') });
  await page.getByRole('button', { name: '使用端侧模型分析' }).click();
  await page.getByRole('button', { name: '确认并加入档案' }).click();
  await expect(page.locator('.claim-list .claim-item')).toHaveCount(3);
  await expect(page.getByLabel('证据健康度 0 分')).toBeVisible();

  for (const [index, phrase] of ['材料只有项目组结论', '材料没有温度记录', '材料没有签收记录'].entries()) {
    await page.locator('.claim-list .claim-item').nth(index).click();
    await expect(page.getByRole('figure', { name: /与 1 条证据的关系图/ })).toContainText(phrase);
    await expect(page.locator('.graph-panel .panel-heading')).toContainText(`第 ${index + 1}/3 条主张`);
  }
  await page.getByText('评分怎么算').click();
  await expect(page.locator('.score-method')).toContainText('模型提示与无法回到原文的摘录不计分');
});
