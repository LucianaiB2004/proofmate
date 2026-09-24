import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:4173/');
await page.screenshot({ path: 'submission/作品展示/界面截图-首屏.png', fullPage: true });
await page.getByRole('button', { name: '体验示例项目' }).click();
await page.getByLabel('证据健康度 68 分').waitFor({ state: 'visible', timeout: 5000 });
await page.screenshot({ path: 'submission/作品展示/界面截图-证据驾驶舱.png', fullPage: true });
await page.getByRole('button', { name: '补充 30 天对照实验' }).click();
await page.getByLabel('证据健康度 85 分').waitFor({ state: 'visible' });
await page.screenshot({ path: 'submission/作品展示/界面截图-补证完成.png', fullPage: true });
await browser.close();
