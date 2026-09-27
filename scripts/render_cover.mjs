import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const source = process.argv[2] ?? 'submission/cover-source.html';
const output = process.argv[3] ?? 'submission/封面.png';
await page.goto(pathToFileURL(resolve(source)).href);
await page.screenshot({ path: output });
await browser.close();
