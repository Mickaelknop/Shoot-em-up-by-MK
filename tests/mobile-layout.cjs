const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile, stat } = require('node:fs/promises');
const { extname, resolve, sep } = require('node:path');
const { chromium } = require('playwright');

const root = resolve(__dirname, '..');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
};

function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let file = resolve(root, `.${pathname}`);
      if (file !== root && !file.startsWith(`${root}${sep}`)) {
        response.writeHead(403).end();
        return;
      }
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      const body = await readFile(file);
      response.writeHead(200, {
        'Content-Type': mimeTypes[extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });

  return new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveServer(server));
  });
}

const scores = Array.from({ length: 10 }, (_, index) => ({
  pseudo: `PILOTE${String(index + 1).padStart(2, '0')}`,
  score: 100000 - index * 4321,
  ship: index % 2 ? 'xwing' : 'nova',
}));

async function mockLeaderboard(page) {
  await page.route('https://*.supabase.co/rest/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/rpc/nova_check_pseudo')) {
      await route.fulfill({ json: 'available' });
      return;
    }
    if (url.includes('/rpc/')) {
      await route.fulfill({ json: { status: 'not_improved', best: 100000 } });
      return;
    }
    await route.fulfill({ json: scores });
  });
}

async function openTitle(browser, baseUrl, viewport) {
  const page = await browser.newPage({ viewport });
  await mockLeaderboard(page);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('#screen-title:not(.hidden)').waitFor();
  await page.waitForFunction(() =>
    document.querySelectorAll('#title-leaderboard .lb-row').length === 10);
  return page;
}

async function assertLeaderboardReachable(page, viewport) {
  const metrics = await page.evaluate(async () => {
    const screen = document.querySelector('#screen-title');
    screen.scrollTop = screen.scrollHeight;
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    const rows = [...document.querySelectorAll('#title-leaderboard .lb-row')];
    const last = rows.at(-1).getBoundingClientRect();
    const frame = screen.getBoundingClientRect();
    return {
      count: rows.length,
      horizontalOverflow: screen.scrollWidth - screen.clientWidth,
      lastTop: last.top,
      lastBottom: last.bottom,
      frameTop: frame.top,
      frameBottom: frame.bottom,
      scrollTop: screen.scrollTop,
      maxScroll: screen.scrollHeight - screen.clientHeight,
    };
  });

  assert.equal(metrics.count, 10, `${viewport.width}x${viewport.height}: Top 10 incomplet`);
  assert.ok(metrics.horizontalOverflow <= 1,
    `${viewport.width}x${viewport.height}: débordement horizontal de ${metrics.horizontalOverflow}px`);
  assert.ok(metrics.lastTop >= metrics.frameTop - 1,
    `${viewport.width}x${viewport.height}: dernière ligne au-dessus de l'écran`);
  assert.ok(metrics.lastBottom <= metrics.frameBottom + 1,
    `${viewport.width}x${viewport.height}: dernière ligne inaccessible en bas`);
  assert.ok(Math.abs(metrics.scrollTop - metrics.maxScroll) <= 1,
    `${viewport.width}x${viewport.height}: le défilement n'atteint pas le bas`);
}

async function assertSingleShipStart(browser, baseUrl) {
  const page = await openTitle(browser, baseUrl, { width: 390, height: 844 });
  await page.locator('#pseudo-input').fill('TESTEUR');
  await page.locator('#btn-start').click();
  await page.locator('#screen-shipselect:not(.hidden)').waitFor();
  await page.evaluate(() => {
    const original = window.__game.startGame.bind(window.__game);
    window.__startGameCalls = 0;
    window.__game.startGame = (...args) => {
      window.__startGameCalls += 1;
      return original(...args);
    };
  });
  await page.locator('[data-ship-id="nova"]').click();
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.__startGameCalls), 1,
    'un clic sur un vaisseau doit lancer exactement une partie');
  await page.close();
}

async function main() {
  const server = await startServer();
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const launchOptions = { headless: true };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  const browser = await chromium.launch(launchOptions);

  try {
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 360, height: 640 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
    ]) {
      const page = await openTitle(browser, baseUrl, viewport);
      await assertLeaderboardReachable(page, viewport);
      await page.close();
    }
    await assertSingleShipStart(browser, baseUrl);
    console.log('OK — Top 10 mobile accessible et démarrage unique vérifiés.');
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
