import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.LETOU_TEST_BASE_URL || 'http://127.0.0.1:5190';
const browser = await chromium.launch({channel:'chrome',headless:true});
const context = await browser.newContext({viewport:{width:1440,height:1000}});
const page = await context.newPage();
const errors = [];
const apiRequests = [];
const workers = [];
page.on('pageerror', error => errors.push(error.message));
page.on('worker', worker => workers.push(worker.url()));
page.on('request', request => {
  if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
});
await mkdir('outputs', {recursive:true});
try {
  const response = await page.goto(base);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-security-policy']).toContain("worker-src 'self'");
  await expect(page.locator('.comparison-table tbody tr')).toHaveCount(13, {timeout:25000});
  await expect(page.getByRole('button', {name:'导入开奖',exact:true})).toHaveCount(0);
  expect(workers.length).toBeGreaterThan(0);
  await page.screenshot({path:'outputs/cloudflare-desktop.png',fullPage:true});

  for (const [area, ruleCount] of [['后区',11], ['前区',13]]) {
    await page.getByRole('button', {name:new RegExp(`^${area}`)}).click();
    for (const periods of [20,30,50,100,200]) {
      await page.getByLabel('观察窗口').selectOption(String(periods));
      await expect(page.locator('.comparison-table tbody tr')).toHaveCount(ruleCount);
      await expect(page.locator('.stat-value').first()).toHaveText(`${periods}期`);
    }
  }

  // Yield between updates so a new selection cancels the previous worker.
  await page.evaluate(async () => {
    const buttons = [...document.querySelectorAll('.segmented-control button')];
    const select = document.querySelector('#period-window');
    for (const [index, periods] of [[1,20],[0,200],[1,50],[0,100]]) {
      buttons[index].click();
      select.value = String(periods);
      select.dispatchEvent(new Event('change', {bubbles:true}));
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  });
  await expect(page.locator('.comparison-table tbody tr')).toHaveCount(13);
  await expect(page.locator('.stat-value').first()).toHaveText('100期');

  await page.getByRole('button', {name:'逐期分布',exact:true}).click();
  await expect(page.locator('.matrix-table thead th')).toHaveCount(15);
  await expect(page.locator('.distribution-card')).toHaveCount(13);
  await page.getByRole('button', {name:'规律图鉴',exact:true}).click();
  await expect(page.locator('.library-rule')).toHaveCount(13);
  await page.getByRole('button', {name:'分析方法',exact:true}).click();
  await expect(page.getByRole('heading', {name:'数据来源与更新'})).toBeVisible();
  await page.getByRole('button', {name:'近期总览',exact:true}).click();

  await page.route('**/data/history.json', route => route.abort('failed'));
  await page.getByRole('button', {name:'更新数据',exact:true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.comparison-table tbody tr')).toHaveCount(13);
  await page.unroute('**/data/history.json');
  await page.getByRole('button', {name:'更新数据',exact:true}).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', {name:'更新数据',exact:true})).toBeEnabled();
  expect(apiRequests).toEqual([]);

  const mobileContext = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const mobile = await mobileContext.newPage();
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(base);
  await expect(mobile.locator('.comparison-table tbody tr')).toHaveCount(13, {timeout:25000});
  await mobile.getByRole('button', {name:/^后区/}).click();
  await expect(mobile.locator('.comparison-table tbody tr')).toHaveCount(11);
  expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await mobile.screenshot({path:'outputs/cloudflare-mobile.png',fullPage:true});
  const unsupported = await mobile.evaluate(async () => (await fetch('/api/lottery/analysis')).status);
  expect(unsupported).toBe(404);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({base,browser:'passed',frontRules:13,backRules:11,windows:5,
    browserWorkers:true,backendRequests:apiRequests.length,mobileOverflow:false,pageErrors:errors.length}));
  await mobileContext.close();
} finally {
  await context.close();
  await browser.close();
}
