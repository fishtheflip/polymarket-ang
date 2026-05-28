import { expect, test } from '@playwright/test';

const whaleTrades = [
  {
    proxyWallet: '0x1111111111111111111111111111111111111111',
    timestamp: 100,
    title: 'Whale BUY market',
    slug: 'whale-buy-market',
    side: 'BUY',
    outcome: 'Yes',
    price: 0.5,
    size: 2000,
    usdcSize: 1000,
    name: 'Buyer',
  },
  {
    proxyWallet: '0x2222222222222222222222222222222222222222',
    timestamp: 101,
    title: 'Whale SELL market',
    slug: 'whale-sell-market',
    side: 'SELL',
    outcome: 'No',
    price: 0.8,
    size: 1500,
    usdcSize: 1200,
    name: 'Seller',
  },
  {
    proxyWallet: '0x3333333333333333333333333333333333333333',
    timestamp: 102,
    title: 'Risky market',
    slug: 'risky-market',
    side: 'BUY',
    outcome: 'Yes',
    price: 0.2,
    size: 4000,
    usdcSize: 800,
    name: 'Risky',
  },
];

test.beforeEach(async ({ page }) => {
  await page.route('https://data-api.polymarket.com/trades**', async (route) => {
    const url = new URL(route.request().url());
    const offset = url.searchParams.get('offset') ?? '0';

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(offset === '0' ? whaleTrades : []),
    });
  });

  await page.route('https://gamma-api.polymarket.com/markets**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
});

test('filters large whale trades by BUY and SELL', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('tab', { name: 'Киты' }).click();
  await expect(page.getByText('Топ-10 крупных сделок')).toBeVisible();
  await expect(page.locator('.whale-move')).toHaveCount(3);

  await page.getByRole('button', { name: 'Фильтр крупных сделок: BUY' }).click();
  await expect(page.locator('.whale-move')).toHaveCount(2);
  await expect(page.getByText('Whale BUY market')).toBeVisible();
  await expect(page.getByText('Risky market')).toBeVisible();
  await expect(page.getByText('Whale SELL market')).toHaveCount(0);

  await page.getByRole('button', { name: 'Фильтр крупных сделок: SELL' }).click();
  await expect(page.locator('.whale-move')).toHaveCount(1);
  await expect(page.getByText('Whale SELL market')).toBeVisible();
  await expect(page.getByText('Whale BUY market')).toHaveCount(0);
});
