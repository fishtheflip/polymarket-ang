import { TestBed } from '@angular/core/testing';
import {
  LinkedPolymarketProfile,
  LinkedPolymarketProfilesService,
} from '../linked-polymarket-profiles.service';
import { PolymarketAccountService } from '../polymarket-account.service';
import { SupabaseAuthService } from '../supabase-auth.service';
import { LinkedPolymarketProfilesStore } from './linked-polymarket-profiles.store';

const address = '0x1111111111111111111111111111111111111111';

const linkedProfile: LinkedPolymarketProfile = {
  id: 'profile-1',
  address,
  name: 'Demo trader',
  pseudonym: 'demo',
  proxyWallet: address,
  profileImage: null,
  xUsername: 'demo_x',
  verifiedBadge: true,
  createdAt: '2026-06-04T00:00:00.000Z',
};

describe('LinkedPolymarketProfilesStore', () => {
  let api: {
    getCurrent: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let polymarketApi: {
    getProfile: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      getCurrent: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(linkedProfile),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    polymarketApi = {
      getProfile: vi.fn().mockResolvedValue({
        name: 'Demo trader',
        pseudonym: 'demo',
        proxyWallet: address,
        profileImage: null,
        xUsername: 'demo_x',
        verifiedBadge: true,
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: LinkedPolymarketProfilesService, useValue: api },
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

  it('loads and links one personal Polymarket profile by wallet address', async () => {
    const store = TestBed.inject(LinkedPolymarketProfilesStore);

    await store.load();
    store.setAddressInput(address);
    await store.add();

    expect(polymarketApi.getProfile).toHaveBeenCalledWith(address);
    expect(api.upsert).toHaveBeenCalledWith(
      address,
      expect.objectContaining({ name: 'Demo trader' }),
    );
    expect(store.profile()).toEqual(linkedProfile);
    expect(store.addressInput()).toBe('');
  });

  it('extracts an address from a Polymarket profile link', async () => {
    const store = TestBed.inject(LinkedPolymarketProfilesStore);

    store.setAddressInput(`https://polymarket.com/profile/${address}`);
    await store.add();

    expect(polymarketApi.getProfile).toHaveBeenCalledWith(address);
  });

  it('rejects invalid addresses', async () => {
    const store = TestBed.inject(LinkedPolymarketProfilesStore);

    store.setAddressInput('not-a-wallet');
    await store.add();

    expect(store.errorKey()).toBe('linkedProfilesInvalidAddress');
    expect(api.upsert).not.toHaveBeenCalled();
  });

  it('removes a linked profile', async () => {
    api.getCurrent.mockResolvedValue(linkedProfile);
    const store = TestBed.inject(LinkedPolymarketProfilesStore);

    await store.load();
    await store.remove(linkedProfile.id);

    expect(api.remove).toHaveBeenCalledWith(linkedProfile.id);
    expect(store.profile()).toBeNull();
  });
});
