/* Local visual QA: capture key PWA screens at mobile and desktop sizes. */
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const BASE = process.env.MOBY_URL || 'http://localhost:4173/';
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.resolve(__dirname, '..', 'shots');

async function openPage(browser, viewport) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: viewport.width < 500 ? 2 : 1,
    isMobile: viewport.width < 500,
    hasTouch: viewport.width < 500,
    locale: 'ru-RU',
    serviceWorkers: 'block'
  });
  const page = await context.newPage();
  return { context, page };
}

async function go(page, url) {
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false });
  console.log('shot', name);
}

(async () => {
  await fs.promises.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const mobile = { width: 390, height: 844 };
  const desktop = { width: 1440, height: 900 };

  {
    const { page, context } = await openPage(browser, mobile);
    await go(page, '');
    await page.evaluate(() => localStorage.clear());
    await go(page, '');
    await shot(page, 'm-welcome');

    await go(page, '?role=parent#/home');
    await shot(page, 'm-parent-home');

    await go(page, '?role=parent#/family');
    await shot(page, 'm-family');

    await go(page, '?role=parent#/missions');
    await shot(page, 'm-missions-parent');

    await go(page, '?role=parent#/qr');
    await shot(page, 'm-qr-app');

    await go(page, '?role=parent#/qr/gift');
    await shot(page, 'm-qr-gift');

    await go(page, '?role=parent#/child/masha');
    await shot(page, 'm-child-detail');

    await go(page, '?role=parent#/limits/masha');
    await shot(page, 'm-limits');

    await go(page, '?role=parent#/age');
    await shot(page, 'm-age');

    await go(page, '?role=parent#/more');
    await shot(page, 'm-more');

    await go(page, '?role=masha#/home');
    await shot(page, 'm-masha-home');

    await go(page, '?role=masha#/savings');
    await shot(page, 'm-masha-savings');

    await go(page, '?role=masha#/missions');
    await shot(page, 'm-masha-missions');

    await go(page, '?role=masha#/cards');
    await shot(page, 'm-cards');

    await go(page, '?role=alex#/home');
    await shot(page, 'm-alex-home');

    await go(page, '?role=alex#/missions');
    await page.evaluate(() => document.querySelector('[data-action="open-mission"]').click());
    await page.waitForTimeout(350);
    await shot(page, 'm-mission-question');

    await go(page, '?role=parent#/home');
    await page.evaluate(() => document.querySelector('[data-action="role-sheet"]').click());
    await page.waitForTimeout(350);
    await shot(page, 'm-role-sheet');

    await go(page, '?gift=masha');
    await shot(page, 'm-gift');

    await go(page, '?role=parent#/install');
    await shot(page, 'm-install');

    await context.close();
  }

  {
    const { page, context } = await openPage(browser, desktop);
    await go(page, '?role=parent#/home');
    await shot(page, 'd-parent-home');
    await context.close();
  }

  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
