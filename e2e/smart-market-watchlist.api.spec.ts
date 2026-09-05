import { createHmac } from 'node:crypto';
import { expect, test, type APIResponse, type Page } from '@playwright/test';

type JsonRecord = Record<string, unknown>;
const API_CONTRACT_JWT_SECRET = 'api-contract-smoke-secret';

async function readJson<T extends JsonRecord | JsonRecord[]>(
  response: APIResponse,
  endpoint: string,
  expectedStatus: number,
): Promise<T> {
  const body = await response.text();
  expect(
    response.status(),
    `${endpoint} returned ${response.status()} instead of ${expectedStatus}: ${body}`,
  ).toBe(expectedStatus);
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(`${endpoint} returned a non-JSON response: ${body}`);
  }
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function expiredToken() {
  const encode = (value: JsonRecord) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ sub: 'expired-user', iat: 1, exp: 2 });
  const unsignedToken = `${header}.${payload}`;
  const signature = createHmac('sha256', API_CONTRACT_JWT_SECRET)
    .update(unsignedToken)
    .digest('base64url');
  return `${unsignedToken}.${signature}`;
}

async function expectNoApiFailures(page: Page, failures: string[]) {
  await expect(
    failures,
    'The live browser flow must not receive an API error response.',
  ).toEqual([]);
}

async function expectUnauthorized(
  response: APIResponse,
  endpoint: string,
  authCase: string,
) {
  const body = await readJson<JsonRecord>(
    response,
    `${endpoint} [${authCase}]`,
    401,
  );
  expect(body, `${endpoint} [${authCase}] must use the documented auth error shape`).toEqual({
    error: {
      code: 'AUTH_ERROR',
      message:
        authCase === 'missing'
          ? 'Authentication is required.'
          : 'Your session is invalid or expired.',
    },
  });
}

test.describe('live API and authentication contract', () => {
  test('logs in and completes the real watchlist attention workflow', async ({
    page,
    request,
  }) => {
    const apiFailures: string[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/api/') && response.status() >= 400) {
        apiFailures.push(`${response.request().method()} ${response.url()} (${response.status()})`);
      }
    });

    const password = 'api-smoke-password';
    const email = `api-contract-${Date.now()}@example.test`;
    const registerResponse = await request.post('/api/auth/register', {
      data: { name: 'API Contract Smoke', email, password },
    });
    const registered = await readJson<JsonRecord>(
      registerResponse,
      'POST /api/auth/register',
      201,
    );
    expect(registered.token, 'registration must return a bearer token').toEqual(
      expect.any(String),
    );

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Return to your watch.' })).toBeVisible();
    await page.getByTestId('input-email').fill(email);
    await page.getByTestId('input-password').fill(password);
    await page.getByTestId('button-submit-auth').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: 'What deserves your attention?' }),
    ).toBeVisible();

    const token = await page.evaluate(() =>
      window.localStorage.getItem('market-watchlist-token'),
    );
    expect(token, 'login must persist the API token for generated client calls').toEqual(
      expect.any(String),
    );

    const me = await readJson<JsonRecord>(
      await request.get('/api/auth/me', { headers: bearer(token!) }),
      'GET /api/auth/me',
      200,
    );
    expect(me.email).toBe(email);
    expect(me.name).toBe('API Contract Smoke');

    await expect(page.getByTestId('input-search-stocks')).toBeVisible();
    await page.getByTestId('input-search-stocks').fill('Tata');
    await expect(page.getByTestId('button-add-TATAMOTORS')).toBeVisible();
    await page.getByTestId('button-add-TATAMOTORS').click();
    await expect(page.getByTestId('status-dashboard-notice')).toContainText(
      'TATAMOTORS added',
    );
    await expect(page.getByTestId('card-attention-TATAMOTORS')).toBeVisible();

    const watchlist = await readJson<JsonRecord>(
      await request.get('/api/watchlist', { headers: bearer(token!) }),
      'GET /api/watchlist',
      200,
    );
    expect(watchlist.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ symbol: 'TATAMOTORS', thresholdPercent: 5 }),
      ]),
    );

    const dashboard = await readJson<JsonRecord>(
      await request.get('/api/market/watchlist', { headers: bearer(token!) }),
      'GET /api/market/watchlist',
      200,
    );
    expect(dashboard.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          symbol: 'TATAMOTORS',
          source: 'MOCK',
          attention: expect.objectContaining({
            score: expect.any(Number),
            signals: expect.any(Array),
          }),
          activeEventId: expect.any(String),
        }),
      ]),
    );

    await page.getByTestId('card-attention-TATAMOTORS').click();
    await expect(page).toHaveURL(/\/stocks\/TATAMOTORS$/);
    await expect(page.getByRole('heading', { name: 'Tata Motors' })).toBeVisible();

    const detail = await readJson<JsonRecord>(
      await request.get('/api/stocks/TATAMOTORS', { headers: bearer(token!) }),
      'GET /api/stocks/TATAMOTORS',
      200,
    );
    expect(detail.item).toEqual(
      expect.objectContaining({
        symbol: 'TATAMOTORS',
        activeEventId: expect.any(String),
      }),
    );
    expect(detail.checkpoint).toEqual(
      expect.objectContaining({
        lastCheckpointPrice: null,
        lastCheckpointTimestamp: null,
      }),
    );

    const eventId = (detail.item as JsonRecord).activeEventId as string;
    const event = await readJson<JsonRecord>(
      await request.get(`/api/events/${eventId}`, { headers: bearer(token!) }),
      `GET /api/events/${eventId}`,
      200,
    );
    expect(event).toEqual(
      expect.objectContaining({
        id: eventId,
        symbol: 'TATAMOTORS',
        status: 'ACTIVE',
      }),
    );

    const acknowledgeResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/events/${eventId}/acknowledge`) &&
        response.request().method() === 'POST',
    );
    await page.getByTestId('button-acknowledge-event').click();
    await expect(page.getByTestId('status-stock-notice')).toContainText(
      'Signal acknowledged',
    );
    const acknowledgedFromBrowser = await readJson<JsonRecord>(
      await acknowledgeResponsePromise,
      `POST /api/events/${eventId}/acknowledge`,
      200,
    );
    expect(acknowledgedFromBrowser).toEqual(
      expect.objectContaining({
        id: eventId,
        status: 'ACKNOWLEDGED',
        acknowledgedAt: expect.any(String),
      }),
    );

    const acknowledged = await readJson<JsonRecord>(
      await request.get(`/api/events/${eventId}`, { headers: bearer(token!) }),
      `GET /api/events/${eventId} after acknowledge`,
      200,
    );
    expect(acknowledged.status).toBe('ACKNOWLEDGED');

    const checkpointResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/stocks/TATAMOTORS/checkpoint') &&
        response.request().method() === 'POST',
    );
    await page.getByTestId('button-update-checkpoint').click();
    await expect(page.getByTestId('status-stock-notice')).toContainText(
      'Checkpoint updated',
    );
    const checkpointFromBrowser = await readJson<JsonRecord>(
      await checkpointResponsePromise,
      'POST /api/stocks/TATAMOTORS/checkpoint',
      200,
    );
    expect(checkpointFromBrowser).toEqual(
      expect.objectContaining({
        lastCheckpointPrice: expect.any(Number),
        lastCheckpointTimestamp: expect.any(String),
      }),
    );
    const detailAfterCheckpoint = await readJson<JsonRecord>(
      await request.get('/api/stocks/TATAMOTORS', { headers: bearer(token!) }),
      'GET /api/stocks/TATAMOTORS after checkpoint',
      200,
    );
    expect(detailAfterCheckpoint.checkpoint).toEqual(
      expect.objectContaining({
        lastCheckpointPrice: expect.any(Number),
        lastCheckpointTimestamp: expect.any(String),
      }),
    );

    await expectNoApiFailures(page, apiFailures);
  });

  test('rejects missing, malformed, and expired sessions before protected reads and writes', async ({
    page,
    request,
  }) => {
    const password = 'api-auth-contract-password';
    const email = `api-auth-contract-${Date.now()}@example.test`;
    const registered = await readJson<JsonRecord>(
      await request.post('/api/auth/register', {
        data: { name: 'Auth Contract Smoke', email, password },
      }),
      'POST /api/auth/register',
      201,
    );
    const token = registered.token as string;

    await readJson<JsonRecord>(
      await request.post('/api/watchlist/items', {
        headers: bearer(token),
        data: { symbol: 'TATAMOTORS' },
      }),
      'POST /api/watchlist/items',
      201,
    );
    const detail = await readJson<JsonRecord>(
      await request.get('/api/stocks/TATAMOTORS', { headers: bearer(token) }),
      'GET /api/stocks/TATAMOTORS',
      200,
    );
    const eventId = (detail.item as JsonRecord).activeEventId as string;
    expect(eventId, 'the seeded stock detail must include an active event').toEqual(
      expect.any(String),
    );

    const authCases = [
      { name: 'missing', headers: {}, browserToken: null },
      { name: 'malformed', headers: bearer('not-a-jwt'), browserToken: 'not-a-jwt' },
      { name: 'expired', headers: bearer(expiredToken()), browserToken: expiredToken() },
    ];
    const protectedEndpoints = [
      {
        name: 'GET /api/market/watchlist',
        request: (headers: Record<string, string>) =>
          request.get('/api/market/watchlist', { headers }),
      },
      {
        name: 'GET /api/stocks/TATAMOTORS',
        request: (headers: Record<string, string>) =>
          request.get('/api/stocks/TATAMOTORS', { headers }),
      },
      {
        name: 'POST /api/stocks/TATAMOTORS/checkpoint',
        request: (headers: Record<string, string>) =>
          request.post('/api/stocks/TATAMOTORS/checkpoint', { headers }),
      },
      {
        name: `POST /api/events/${eventId}/acknowledge`,
        request: (headers: Record<string, string>) =>
          request.post(`/api/events/${eventId}/acknowledge`, { headers }),
      },
    ];
    const browserProtectedRequests: string[] = [];
    page.on('request', (browserRequest) => {
      const path = new URL(browserRequest.url()).pathname;
      if (
        path.includes('/api/watchlist') ||
        path.includes('/api/market/watchlist') ||
        path.includes('/api/stocks') ||
        path.includes('/api/events')
      ) {
        browserProtectedRequests.push(`${browserRequest.method()} ${path}`);
      }
    });

    for (const authCase of authCases) {
      for (const endpoint of protectedEndpoints) {
        await expectUnauthorized(
          await endpoint.request(authCase.headers),
          endpoint.name,
          authCase.name,
        );
      }

      await page.goto('/login');
      await page.evaluate((browserToken) => {
        if (browserToken) {
          window.localStorage.setItem('market-watchlist-token', browserToken);
        } else {
          window.localStorage.removeItem('market-watchlist-token');
        }
      }, authCase.browserToken);
      browserProtectedRequests.length = 0;
      const browserAuthResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/auth/me') &&
          response.request().method() === 'GET',
      );
      await page.goto('/');
      await expectUnauthorized(
        await browserAuthResponse,
        'GET /api/auth/me (browser)',
        authCase.name,
      );
      await page.waitForLoadState('networkidle');
      expect(
        browserProtectedRequests,
        `${authCase.name} browser auth failure must stop before the watchlist`,
      ).toEqual([]);
    }
  });
});