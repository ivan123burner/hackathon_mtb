/* End-to-end smoke tests for the demo flows. */
'use strict';

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-core');
const jsQR = require('jsqr');
const { PNG } = require('pngjs');

const BASE = process.env.MOBY_URL || 'http://localhost:4173/';
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.resolve(__dirname, '..', 'shots');

let failed = 0;
function check(name, condition, extra) {
  if (condition) {
    console.log('PASS', name);
  } else {
    failed += 1;
    console.error('FAIL', name, extra || '');
  }
}

async function decodeQr(page, name) {
  await fs.promises.mkdir(OUT, { recursive: true });
  const el = page.locator('.qr-screen__code');
  await el.waitFor({ state: 'visible' });
  const file = path.join(OUT, name + '-qr.png');
  await el.screenshot({ path: file });
  const png = PNG.sync.read(fs.readFileSync(file));
  const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return { code, file };
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'ru-RU',
    serviceWorkers: 'block'
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  // Welcome -> parent via actual UI.
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('[data-action="switch-role"][data-role="parent"]').first().click();
  await page.waitForTimeout(300);
  check('role switch to parent', page.url().includes('role=parent'), page.url());
  check('parent home visible', await page.locator('.balance-panel').count() === 1);

  // Limits.
  await page.evaluate(() => { location.hash = '#/limits/masha'; });
  await page.waitForTimeout(300);
  check('limits title genitive', (await page.locator('.subhead h1').innerText()).includes('Маши'));
  await page.locator('#limitRange').evaluate((el) => {
    el.value = '120';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('[data-action="save-limits"]').click();
  await page.waitForTimeout(400);
  const savedLimits = await page.evaluate(() => JSON.parse(localStorage.getItem('moby-family-state-v1')).limits.masha.weekly);
  check('limits saved', Number(savedLimits) === 120, savedLimits);

  // Role switch via sheet.
  await page.evaluate(() => { location.hash = '#/home'; });
  await page.waitForTimeout(300);
  await page.locator('[data-action="role-sheet"]').first().click();
  await page.waitForTimeout(200);
  await page.locator('.role-row[data-role="masha"]').click();
  await page.waitForTimeout(450);
  check('role switch via sheet', page.url().includes('role=masha'), page.url());

  // Mission flow.
  await page.evaluate(() => { location.hash = '#/missions'; });
  await page.waitForTimeout(300);
  await page.locator('.featured-mission').click();
  await page.waitForTimeout(250);
  check('mission overlay open', await page.locator('.mission-screen').count() === 1);
  for (let q = 0; q < 3; q += 1) {
    await page.locator('.mission-option[data-index="0"]').click();
    await page.waitForTimeout(180);
    await page.locator('[data-action="mission-next"]').click();
    await page.waitForTimeout(250);
  }
  check('mission completed screen', await page.locator('.mission-screen--done').count() === 1);
  await page.screenshot({ path: path.join(OUT, 't-mission-done.png') });
  await page.locator('[data-action="mission-finish"]').click();
  await page.waitForTimeout(300);
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem('moby-family-state-v1')).missionsDone.masha);
  check('mission stored', done.includes('snacks'), done.join(','));

  // Age simulator.
  await page.evaluate((base) => { location.href = base + '?role=parent#/age'; }, BASE);
  await page.waitForTimeout(500);
  await page.locator('#ageSlider').evaluate((el) => {
    el.value = '18';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  check('age updates', (await page.locator('#ageValue').innerText()) === '18');
  check('adult CTA visible', await page.locator('[data-action="open-adult"]').count() === 1);
  await page.screenshot({ path: path.join(OUT, 't-age-18.png') });
  await page.locator('[data-action="open-adult"]').click();
  await page.waitForTimeout(500);
  check('adult role', page.url().includes('role=adult'), page.url());

  // Gift flow.
  await page.evaluate((base) => { location.href = base + '?gift=masha'; }, BASE);
  await page.waitForTimeout(600);
  await page.locator('.gift-amount[data-amount="50"]').click();
  await page.locator('.gift-message textarea').fill('На твои первые наушники!');
  await page.locator('[data-action="gift-send"]').click();
  await page.waitForTimeout(1600);
  check('gift success', (await page.locator('.gift-success h1').innerText()).includes('50 BYN'));
  await page.screenshot({ path: path.join(OUT, 't-gift-success.png') });

  // QR decoding.
  await page.evaluate((base) => { location.href = base + '?role=parent#/qr'; }, BASE);
  await page.waitForTimeout(600);
  const { code, file } = await decodeQr(page, 't-qr');
  check('QR decodes', !!code, file);
  check('QR points to app role=parent', !!code && code.data.includes('role=parent'), code && code.data);

  // Sheet / install page presence.
  await page.evaluate((base) => { location.href = base + '?role=parent#/qr'; }, BASE);
  await page.waitForTimeout(500);
  await page.locator('.install-banner [data-install]').click();
  await page.waitForTimeout(300);
  check('install sheet fallback', (await page.locator('.sheet').innerText()).includes('Установить'));
  await page.locator('.sheet [data-action="close-sheet"]').click();
  await page.waitForTimeout(300);

  // Top-up sheet.
  await page.evaluate(() => { location.hash = '#/home'; });
  await page.waitForTimeout(300);
  await page.locator('[data-action="open-topup"]').first().click();
  await page.waitForTimeout(300);
  await page.locator('.amount-chip[data-amount="50"]').click();
  await page.locator('[data-action="topup-confirm"]').click();
  await page.waitForTimeout(300);
  check('topup sheet closed', await page.locator('.sheet').count() === 0);
  check('topup toast', (await page.locator('#toastRoot').innerText()).includes('+50 BYN'), await page.locator('#toastRoot').innerText());

  // Invite sheet and QR.
  await page.evaluate(() => { location.hash = '#/family'; });
  await page.waitForTimeout(300);
  await page.locator('[data-action="open-invite"]').first().click();
  await page.waitForTimeout(400);
  check('invite QR rendered', await page.locator('.invite-qr .qr-live').count() === 1);
  await page.screenshot({ path: path.join(OUT, 't-invite.png') });
  await page.locator('.sheet [data-action="close-sheet"]').click();
  await page.waitForTimeout(300);

  // QR tabs.
  await page.evaluate(() => { location.hash = '#/qr'; });
  await page.waitForTimeout(300);
  await page.locator('.segmented [data-tab="gift"]').click();
  await page.waitForTimeout(400);
  check('QR gift tab', (await page.locator('.qr-screen h2').innerText()).includes('Подарить'));
  await page.locator('[data-action="select-gift-child"][data-child="alex"]').click();
  await page.waitForTimeout(400);
  check('QR gift child switch', (await page.locator('.qr-screen h2').innerText()).includes('Алексу'), await page.locator('.qr-screen h2').innerText());
  const alexQr = await decodeQr(page, 't-qr-alex');
  check('QR gift link targets Alex', !!alexQr.code && alexQr.code.data.includes('gift=alex'), alexQr.code && alexQr.code.data);
  await page.locator('.segmented [data-tab="invite"]').click();
  await page.waitForTimeout(400);
  check('QR invite tab', (await page.locator('.qr-screen h2').innerText()).includes('Пригласить'));

  // More screen: package block, menu and package shortcut from family.
  await page.evaluate((base) => { location.href = base + '?role=parent#/more'; }, BASE);
  await page.waitForTimeout(500);
  check('package block visible', await page.locator('#packageBlock').count() === 1);
  check('more menu items', await page.locator('.more-row').count() === 9, await page.locator('.more-row').count());
  await page.evaluate((base) => { location.href = base + '?role=parent#/family'; }, BASE);
  await page.waitForTimeout(400);
  await page.locator('.family-hero__package').click();
  await page.waitForTimeout(500);
  check('package shortcut opens more', page.url().includes('#/more'), page.url());
  check('package shortcut lands on package', await page.locator('#packageBlock').isVisible());

  check('no runtime errors', errors.length === 0, errors.join(' | '));

  await context.close();

  // Offline / service worker check.
  const swContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    serviceWorkers: 'allow'
  });
  const swPage = await swContext.newPage();
  await swPage.goto(BASE + '?role=parent', { waitUntil: 'networkidle' });
  await swPage.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await swPage.waitForTimeout(800);
  await swContext.setOffline(true);
  await swPage.reload({ waitUntil: 'domcontentloaded' });
  await swPage.waitForTimeout(900);
  check('offline reload works', (await swPage.locator('#app').count()) === 1);
  check('offline home renders', (await swPage.locator('.balance-panel').count()) === 1);
  await swContext.close();

  await browser.close();
  if (failed) {
    console.error('\n' + failed + ' checks failed');
    process.exit(1);
  }
  console.log('\nAll checks passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
