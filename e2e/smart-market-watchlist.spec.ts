import { expect, test, type Page, type Route } from '@playwright/test';

const now = '2026-09-05T12:00:00.000Z';
const user = {
  id: 'user-smoke',
  name: 'Alex Morgan',
  email: 'alex@example.com',
};

const explanation = {
  fact: 'AAPL moved meaningfully since your last checkpoint.',
  signal: 'Price and volume moved together.',
  context: 'The broader market moved less during the same window.',
  explanation: 'A meaningful move since your last check deserves a closer look.',
  unknown: 'No additional context is available.',
  source: 'Smoke-test market fixture',
};

const signals = [
  {
    type: 'PRICE_MOVE',
    label: 'Price movement',
    value: 8.4,
    severity: 'HIGH',
    contribution: 20,
  },
  {
    type: 'VOLUME_ANOMALY',
    label: 'Volume activity',
    value: 1.8,
    severity: 'MEDIUM',
    contribution: 10,
  },
];

function marketItem(symbol: string, attention: boolean) {
  return {
    symbol,
    companyName: symbol === 'AAPL' ? 'Apple Inc.' : 'Microsoft Corporation',
    exchange: 'NASDAQ',
    sector: 'Technology',
    price: symbol === 'AAPL' ? 184.24 : 425.11,
    changePercent: symbol === 'AAPL' ? 8.4 : 0.8,
    volumeRatio: attention ? 1.8 : 1.1,
    sectorChangePercent: 1.2,
    marketChangePercent: 0.6,
    observedAt: now,
    source: 'Smoke-test market fixture',
    isStale: false,
    marketState: 'OPEN',
    attention: attention
      ? {
          score: 82,
          severity: 'HIGH',
          sinceLastCheckPercent: 8.4,
          sinceLastCheckAt: now,
          signals,
          explanation,
        }
      : {
          score: 12,
          severity: 'LOW',
          sinceLastCheckPercent: 0.8,
          sinceLastCheckAt: now,
          signals: [],
          explanation,
        },
    activeEventId: attention ? 'event-aapl' : null,
    thresholdPercent: 5,
  };
}

function event(acknowledged: boolean) {
  return {
    id: 'event-aapl',
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    detectedAt: now,
    score: 82,
    severity: 'HIGH',
    status: acknowledged ? 'ACKNOWLEDGED' : 'ACTIVE',
    acknowledgedAt: acknowledged ? now : null,
    explanation,
    signals,
  };
}

function stockDetail(acknowledged: boolean) {
  return {
    item: marketItem('AAPL', true),
    checkpoint: {
      lastViewedAt: now,
      lastCheckpointPrice: 170,
      lastCheckpointTimestamp: now,
    },
    timeline: [
      {
        timestamp: now,
        label: 'Price movement',
        detail: 'Price moved 8.4% since the last checkpoint.',
        kind: 'PRICE_MOVE',
      },
    ],
    event: event(acknowledged),
  };
}

async function mockAuthenticatedApi(page: Page) {
  let acknowledged = false;
  let threshold = 5;
  let watchlist = [
    {
      id: 'item-aapl',
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      exchange: 'NASDAQ',
      thresholdPercent: threshold,
      lastViewedAt: now,
      lastCheckpointPrice: 170,
      lastCheckpointTimestamp: now,
    },
    {
      id: 'item-msft',
      symbol: 'MSFT',
      companyName: 'Microsoft Corporation',
      exchange: 'NASDAQ',
      thresholdPercent: 5,
      lastViewedAt: now,
      lastCheckpointPrice: 420,
      lastCheckpointTimestamp: now,
    },
  ];

  await page.addInitScript(() => {
    window.localStorage.setItem('market-watchlist-token', 'smoke-test-token');
  });

  await page.route('**/api/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });

    if (path === '/api/auth/me' && request.method() === 'GET') return json(user);
    if (path === '/api/watchlist' && request.method() === 'GET') return json({ id: 'watchlist-smoke', name: 'My watchlist', items: watchlist });
    if (path === '/api/market/watchlist' && request.method() === 'GET') {
      const attentionItem = marketItem('AAPL', true);
      const normalItem = marketItem('MSFT', false);
      return json({
        marketState: 'OPEN',
        updatedAt: now,
        items: [attentionItem, normalItem],
        attentionItems: [attentionItem],
      });
    }
    if (path === '/api/stocks/search' && request.method() === 'GET') {
      return json([{ symbol: 'TSLA', companyName: 'Tesla, Inc.', exchange: 'NASDAQ', sector: 'Consumer Cyclical' }]);
    }
    if (path === '/api/watchlist/items' && request.method() === 'POST') {
      const item = {
        id: 'item-tsla',
        symbol: 'TSLA',
        companyName: 'Tesla, Inc.',
        exchange: 'NASDAQ',
        thresholdPercent: 5,
        lastViewedAt: null,
        lastCheckpointPrice: null,
        lastCheckpointTimestamp: null,
      };
      watchlist = [...watchlist, item];
      return json(item, 201);
    }
    if (path === '/api/stocks/AAPL' && request.method() === 'GET') return json(stockDetail(acknowledged));
    if (path === '/api/events/event-aapl' && request.method() === 'GET') return json(event(acknowledged));
    if (path === '/api/stocks/AAPL/checkpoint' && request.method() === 'POST') {
      return json({ lastViewedAt: now, lastCheckpointPrice: 184.24, lastCheckpointTimestamp: now });
    }
    if (path === '/api/events/event-aapl/acknowledge' && request.method() === 'POST') {
      acknowledged = true;
      return json(event(true));
    }
    if (path === '/api/watchlist/items/AAPL/settings' && request.method() === 'PATCH') {
      const body = request.postDataJSON() as { thresholdPercent?: number };
      threshold = body.thresholdPercent ?? threshold;
      watchlist = watchlist.map((item) => item.symbol === 'AAPL' ? { ...item, thresholdPercent: threshold } : item);
      return json(watchlist[0]);
    }

    return route.continue();
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.documentWidth, 'the page should not overflow horizontally').toBeLessThanOrEqual(overflow.viewportWidth);
}

test.describe('responsive authenticated dashboard smoke', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedApi(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'What deserves your attention?' })).toBeVisible();
  });

  test('keeps the dashboard usable and preserves the core attention workflow', async ({ page }) => {
    const project = test.info().project.name;
    await expectNoHorizontalOverflow(page);

    if (project === 'desktop') {
      await expect(page.getByTestId('link-nav-attention-desk')).toBeVisible();
      await expect(page.getByTestId('button-open-menu')).toBeHidden();
    } else {
      await expect(page.getByTestId('button-open-menu')).toBeVisible();
      await expect.poll(async () => (await page.getByTestId('link-nav-attention-desk').boundingBox())?.x ?? -1).toBeLessThan(0);
    }

    const focusTarget = page.getByTestId('link-settings-from-dashboard');
    await focusTarget.focus();
    await expect(focusTarget).toBeFocused();
    await expect.poll(() => focusTarget.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');

    await page.getByTestId('input-search-stocks').fill('tesla');
    await expect(page.getByTestId('button-add-TSLA')).toBeVisible();
    await page.getByTestId('button-add-TSLA').click();
    await expect(page.getByTestId('status-dashboard-notice')).toContainText('TSLA added');

    await page.getByTestId('link-settings-from-dashboard').click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Set your signal sensitivity.' })).toBeVisible();
    await page.getByTestId('input-threshold-AAPL').fill('7');
    await page.getByTestId('button-save-AAPL').click();
    await expect(page.getByTestId('status-settings-saved')).toContainText('AAPL will now surface at 7%');

    await page.getByTestId('link-settings-back').click();
    await expect(page).toHaveURL(/\/$/);
    await page.getByTestId('card-attention-AAPL').click();
    await expect(page).toHaveURL(/\/stocks\/AAPL$/);
    await expect(page.getByRole('heading', { name: 'Apple Inc.' })).toBeVisible();

    await page.getByTestId('button-update-checkpoint').click();
    await expect(page.getByTestId('status-stock-notice')).toContainText('Checkpoint updated');
    await page.getByTestId('button-acknowledge-event').click();
    await expect(page.getByTestId('status-stock-notice')).toContainText('Signal acknowledged');
    await expect(page.getByTestId('button-acknowledge-event')).toBeDisabled();
    await expectNoHorizontalOverflow(page);
  });

  test('opens and fully closes the mobile navigation drawer', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', 'drawer coverage is specific to the mobile project');

    await page.getByTestId('button-open-menu').click();
    await expect.poll(async () => (await page.getByTestId('button-close-menu').boundingBox())?.x ?? -1).toBeGreaterThanOrEqual(0);
    await expect(page.getByTestId('button-dismiss-menu')).toBeVisible();
    await expect.poll(async () => (await page.getByTestId('link-nav-preferences').boundingBox())?.x ?? -1).toBeGreaterThanOrEqual(0);

    await page.getByTestId('button-close-menu').click();
    await expect(page.getByTestId('button-dismiss-menu')).toHaveCount(0);
    await expect.poll(async () => (await page.getByTestId('button-close-menu').boundingBox())?.x ?? 0).toBeLessThan(0);
    await expect.poll(async () => (await page.getByTestId('link-nav-preferences').boundingBox())?.x ?? 0).toBeLessThan(0);
    await expectNoHorizontalOverflow(page);
  });
});