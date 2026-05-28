import { TestBed } from '@angular/core/testing';
import { GammaMarket, PolymarketMarketService } from '../polymarket-market.service';
import { MarketStore } from './market.store';

const markets: GammaMarket[] = [
  {
    id: '1',
    question: 'Will ETH close above $4k?',
    slug: 'eth-above-4k',
    outcomes: '["No","Yes"]',
    outcomePrices: '["0.35","0.65"]',
    volumeNum: 1_000_000,
    volume24hr: 250_000,
    liquidityNum: 50_000,
    active: true,
    closed: false,
    tags: [{ label: 'Crypto' }],
  },
  {
    id: '2',
    question: 'Will the Fed cut rates?',
    slug: 'fed-cut-rates',
    outcomes: '["No","Yes"]',
    outcomePrices: '["0.55","0.45"]',
    volumeNum: 2_000_000,
    volume24hr: 500_000,
    liquidityNum: 100_000,
    active: true,
    closed: false,
    events: [{ category: 'Macro' }],
  },
];

describe('MarketStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PolymarketMarketService,
          useValue: {
            getTopMarkets: () => Promise.resolve(markets),
          },
        },
      ],
    });
  });

  it('loads markets and builds overview rows', async () => {
    const store = TestBed.inject(MarketStore);

    await store.loadMarkets();

    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.rows()).toEqual([
      expect.objectContaining({
        title: 'Will ETH close above $4k?',
        category: 'Crypto',
        probability: 65,
        side: 'Yes',
        liquidity: 50,
      }),
      expect.objectContaining({
        title: 'Will the Fed cut rates?',
        category: 'Macro',
        probability: 55,
        side: 'No',
        liquidity: 100,
      }),
    ]);
  });

  it('builds stats, market mix, signal score, and insights', async () => {
    const store = TestBed.inject(MarketStore);

    await store.loadMarkets();

    expect(store.stats().map((stat) => stat.label)).toEqual([
      'Отслеживаемый объем',
      'Активные рынки',
      'Объем 24ч',
      'Средняя ликвидность',
    ]);
    expect(store.mix()).toEqual([
      { label: 'Macro', percent: 67 },
      { label: 'Crypto', percent: 33 },
    ]);
    expect(store.signalScore()).toBe(60);
    expect(store.insights()[0]).toEqual({
      action: '65% Yes',
      market: 'Will ETH close above $4k?',
      value: '$250.0K 24h',
    });
  });
});
