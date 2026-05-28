import { TestBed } from '@angular/core/testing';
import { PolymarketAccountService, PolymarketTrade } from '../polymarket-account.service';
import { WhaleStore } from './whale.store';

const trades: PolymarketTrade[] = [
  {
    proxyWallet: '0x1111111111111111111111111111111111111111',
    timestamp: 100,
    title: 'Large buy',
    slug: 'large-buy',
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
    title: 'Large sell',
    slug: 'large-sell',
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
    title: 'Risky buy',
    slug: 'risky-buy',
    side: 'BUY',
    outcome: 'Yes',
    price: 0.2,
    size: 4000,
    usdcSize: 800,
    name: 'Risky',
  },
];

describe('WhaleStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PolymarketAccountService,
          useValue: {
            getRecentTrades: () => Promise.resolve(trades),
          },
        },
      ],
    });
  });

  it('loads trades and builds the large movements list', async () => {
    const store = TestBed.inject(WhaleStore);

    await store.loadTrades();

    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.whaleMovements().map((movement) => movement.title)).toEqual(['Large sell', 'Large buy', 'Risky buy']);
  });

  it('filters large trades by BUY and SELL side', async () => {
    const store = TestBed.inject(WhaleStore);

    await store.loadTrades();
    store.setLargeSideFilter('buy');

    expect(store.selectedMovements().every((movement) => !movement.isNegative)).toBe(true);
    expect(store.selectedMovements().map((movement) => movement.title)).toEqual(['Large buy', 'Risky buy']);

    store.setLargeSideFilter('sell');

    expect(store.selectedMovements().every((movement) => movement.isNegative)).toBe(true);
    expect(store.selectedMovements().map((movement) => movement.title)).toEqual(['Large sell']);
  });

  it('shows risky trades from $500 with low price', async () => {
    const store = TestBed.inject(WhaleStore);

    await store.loadTrades();
    store.setMode('risky');

    expect(store.selectedMovements().map((movement) => movement.title)).toEqual(['Risky buy']);
  });

  it('tracks a market by slug and builds active participants', async () => {
    const store = TestBed.inject(WhaleStore);

    await store.loadTrades();
    store.setWatchedMarketInput('https://polymarket.com/market/large-buy');
    await store.watchMarket();

    expect(store.watchedMarketSlug()).toBe('large-buy');
    expect(store.watchedMarketTrades().map((movement) => movement.title)).toEqual(['Large buy']);
    expect(store.watchedMarketParticipants()).toEqual([
      expect.objectContaining({
        address: '0x1111111111111111111111111111111111111111',
        buyValue: 1000,
        netValue: 1000,
        netShares: 2000,
        trades: 1,
      }),
    ]);
  });
});
