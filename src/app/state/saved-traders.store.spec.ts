import { TestBed } from '@angular/core/testing';
import { PolymarketAccountService } from '../polymarket-account.service';
import { SavedTrader, SavedTradersService } from '../saved-traders.service';
import { SupabaseAuthService } from '../supabase-auth.service';
import { SavedTradersStore } from './saved-traders.store';

const address = '0x1111111111111111111111111111111111111111';

const savedTrader: SavedTrader = {
  id: 'trader-1',
  address,
  name: 'Demo trader',
  pseudonym: 'demo',
  profileImage: null,
  createdAt: '2026-06-06T00:00:00.000Z',
};

describe('SavedTradersStore', () => {
  let api: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let polymarketApi: {
    getProfile: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(savedTrader),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    polymarketApi = {
      getProfile: vi.fn().mockResolvedValue({
        name: 'Demo trader',
        pseudonym: 'demo',
        proxyWallet: address,
        profileImage: null,
        xUsername: null,
        verifiedBadge: false,
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SavedTradersService, useValue: api },
        { provide: PolymarketAccountService, useValue: polymarketApi },
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

  it('loads, saves, and removes a trader', async () => {
    const store = TestBed.inject(SavedTradersStore);

    await store.load();
    store.setAddressInput(address);
    await store.save();

    expect(polymarketApi.getProfile).toHaveBeenCalledWith(address);
    expect(api.create).toHaveBeenCalledWith(
      address,
      expect.objectContaining({ name: 'Demo trader' }),
    );
    expect(store.traders()).toEqual([savedTrader]);
    expect(store.remainingSlots()).toBe(19);

    await store.remove(savedTrader.id);
    expect(store.traders()).toEqual([]);
  });

  it('rejects invalid and duplicate trader addresses', async () => {
    api.list.mockResolvedValue([savedTrader]);
    const store = TestBed.inject(SavedTradersStore);

    store.setAddressInput('invalid');
    await store.save();
    expect(store.errorKey()).toBe('savedTradersInvalidAddress');

    await store.load();
    store.setAddressInput(address);
    await store.save();
    expect(store.errorKey()).toBe('savedTradersDuplicate');
    expect(api.create).not.toHaveBeenCalled();
  });

  it('enforces the 20 trader limit', async () => {
    api.list.mockResolvedValue(
      Array.from({ length: 20 }, (_, index) => ({
        ...savedTrader,
        id: `trader-${index}`,
        address: `0x${index.toString(16).padStart(40, '0')}`,
      })),
    );
    const store = TestBed.inject(SavedTradersStore);

    await store.load();
    store.setAddressInput('0xffffffffffffffffffffffffffffffffffffffff');
    await store.save();

    expect(store.isAtLimit()).toBe(true);
    expect(store.errorKey()).toBe('savedTradersLimitReached');
    expect(api.create).not.toHaveBeenCalled();
  });
});
