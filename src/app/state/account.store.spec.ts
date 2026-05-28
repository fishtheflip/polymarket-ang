import { TestBed } from '@angular/core/testing';
import { PolymarketAccountService } from '../polymarket-account.service';
import { AccountStore } from './account.store';

const address = '0x1111111111111111111111111111111111111111';

describe('AccountStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PolymarketAccountService,
          useValue: {
            getProfile: () =>
              Promise.resolve({
                name: 'Demo trader',
                pseudonym: 'demo',
                proxyWallet: address,
                profileImage: null,
                xUsername: 'demo_x',
                verifiedBadge: true,
              }),
            getPositions: () =>
              Promise.resolve([
                {
                  proxyWallet: address,
                  asset: 'asset-1',
                  conditionId: 'condition-1',
                  title: 'Open market',
                  slug: 'open-market',
                  eventSlug: 'open-event',
                  outcome: 'Yes',
                  oppositeOutcome: 'No',
                  currentValue: 120,
                  initialValue: 100,
                  cashPnl: 20,
                  percentPnl: 20,
                  realizedPnl: 0,
                  percentRealizedPnl: 0,
                  totalBought: 100,
                  curPrice: 0.6,
                  avgPrice: 0.5,
                  size: 200,
                  endDate: '2026-12-31',
                  redeemable: false,
                  mergeable: false,
                  negativeRisk: false,
                },
              ]),
            getClosedPositions: () => Promise.resolve([]),
            getActivity: () => Promise.reject(new Error('activity unavailable')),
            getTrades: () => Promise.resolve([]),
            getTradedMarketsCount: () => Promise.resolve(7),
            getPositionValue: () => Promise.resolve(120),
          },
        },
      ],
    });
  });

  it('stores address input and validates wallet format', () => {
    const store = TestBed.inject(AccountStore);

    store.setAddress('bad-address');
    expect(store.isValidAddress()).toBe(false);

    store.setAddress(address);
    expect(store.isValidAddress()).toBe(true);
  });

  it('loads account data with fallbacks for partial endpoint failures', async () => {
    const store = TestBed.inject(AccountStore);

    store.setAddress(address);
    await store.loadAccount();

    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.loadedAddress()).toBe(address);
    expect(store.profile()?.name).toBe('Demo trader');
    expect(store.positions()).toHaveLength(1);
    expect(store.activity()).toEqual([]);
    expect(store.tradedMarkets()).toBe(7);
    expect(store.positionValue()).toBe(120);
    expect(store.currentValue()).toBe(120);
    expect(store.initialValue()).toBe(100);
    expect(store.openPnl()).toBe(20);
    expect(store.realizedPnl()).toBe(0);
    expect(store.topPositions()).toHaveLength(1);
    expect(store.topClosedPositions()).toEqual([]);
    expect(store.recentActivity()).toEqual([]);
    expect(store.recentTrades()).toEqual([]);
    expect(store.displayName()).toBe('Demo trader');
  });
});
