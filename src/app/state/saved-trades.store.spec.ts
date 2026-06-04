import { TestBed } from '@angular/core/testing';
import { SavedTrade, SavedTradesService } from '../saved-trades.service';
import { SupabaseAuthService } from '../supabase-auth.service';
import { SavedTradesStore } from './saved-trades.store';

const savedTrade: SavedTrade = {
  id: 'trade-1',
  url: 'https://polymarket.com/event/example-market',
  title: 'example market',
  createdAt: '2026-06-04T00:00:00.000Z',
};

describe('SavedTradesStore', () => {
  let api: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(savedTrade),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SavedTradesService, useValue: api },
        {
          provide: SupabaseAuthService,
          useValue: {
            isConfigured: true,
            onAuthStateChange: vi.fn(),
          },
        },
      ],
    });
  });

  it('loads, saves, and removes a Polymarket link', async () => {
    const store = TestBed.inject(SavedTradesStore);

    await store.load();
    store.setLinkInput('https://polymarket.com/event/example-market');
    await store.save();

    expect(api.create).toHaveBeenCalledWith('https://polymarket.com/event/example-market', 'example market');
    expect(store.trades()).toEqual([savedTrade]);
    expect(store.remainingSlots()).toBe(19);

    await store.remove(savedTrade.id);

    expect(api.remove).toHaveBeenCalledWith(savedTrade.id);
    expect(store.trades()).toEqual([]);
  });

  it('rejects links outside Polymarket', async () => {
    const store = TestBed.inject(SavedTradesStore);

    store.setLinkInput('https://example.com/trade');
    await store.save();

    expect(api.create).not.toHaveBeenCalled();
    expect(store.errorKey()).toBe('savedTradesInvalidLink');
  });

  it('rejects a duplicate link', async () => {
    api.list.mockResolvedValue([savedTrade]);
    const store = TestBed.inject(SavedTradesStore);

    await store.load();
    store.setLinkInput(savedTrade.url);
    await store.save();

    expect(api.create).not.toHaveBeenCalled();
    expect(store.errorKey()).toBe('savedTradesDuplicate');
  });

  it('enforces the 20 trade limit', async () => {
    api.list.mockResolvedValue(
      Array.from({ length: 20 }, (_, index) => ({
        ...savedTrade,
        id: `trade-${index}`,
        url: `https://polymarket.com/event/market-${index}`,
      })),
    );
    const store = TestBed.inject(SavedTradesStore);

    await store.load();
    store.setLinkInput('https://polymarket.com/event/market-21');
    await store.save();

    expect(store.isAtLimit()).toBe(true);
    expect(api.create).not.toHaveBeenCalled();
    expect(store.errorKey()).toBe('savedTradesLimitReached');
  });
});
