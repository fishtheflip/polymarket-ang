import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { PolymarketAccountService } from '../polymarket-account.service';
import { SavedTrader, SavedTradersService } from '../saved-traders.service';
import { SupabaseAuthService } from '../supabase-auth.service';

export type SavedTradersErrorKey =
  | 'savedTradersDuplicate'
  | 'savedTradersGenericError'
  | 'savedTradersInvalidAddress'
  | 'savedTradersLimitReached';

type SavedTradersState = {
  traders: SavedTrader[];
  addressInput: string;
  loading: boolean;
  errorKey: SavedTradersErrorKey | null;
};

const maxSavedTraders = 20;

const initialState: SavedTradersState = {
  traders: [],
  addressInput: '',
  loading: false,
  errorKey: null,
};

export const SavedTradersStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ traders }) => ({
    remainingSlots: computed(() => maxSavedTraders - traders().length),
    isAtLimit: computed(() => traders().length >= maxSavedTraders),
  })),
  withMethods(
    (
      store,
      savedTradersApi = inject(SavedTradersService),
      polymarketApi = inject(PolymarketAccountService),
      auth = inject(SupabaseAuthService),
    ) => ({
      initialize(): void {
        if (!auth.isConfigured) {
          return;
        }

        auth.onAuthStateChange((_event, user) => {
          if (user) {
            void this.load();
          } else {
            patchState(store, { traders: [], addressInput: '', errorKey: null });
          }
        });

        void this.load();
      },

      setAddressInput(addressInput: string): void {
        patchState(store, { addressInput, errorKey: null });
      },

      async load(): Promise<void> {
        patchState(store, { loading: true, errorKey: null });

        try {
          const traders = await savedTradersApi.list();
          patchState(store, { traders });
        } catch {
          patchState(store, { traders: [], errorKey: 'savedTradersGenericError' });
        } finally {
          patchState(store, { loading: false });
        }
      },

      async save(): Promise<void> {
        const address = parseTraderAddress(store.addressInput());

        if (!address) {
          patchState(store, { errorKey: 'savedTradersInvalidAddress' });
          return;
        }

        if (store.isAtLimit()) {
          patchState(store, { errorKey: 'savedTradersLimitReached' });
          return;
        }

        if (
          store.traders().some((trader) => trader.address.toLowerCase() === address.toLowerCase())
        ) {
          patchState(store, { errorKey: 'savedTradersDuplicate' });
          return;
        }

        patchState(store, { loading: true, errorKey: null });

        try {
          const profile = await polymarketApi.getProfile(address);
          const trader = await savedTradersApi.create(address, profile);
          patchState(store, { traders: [trader, ...store.traders()], addressInput: '' });
        } catch {
          patchState(store, { errorKey: 'savedTradersGenericError' });
        } finally {
          patchState(store, { loading: false });
        }
      },

      async remove(id: string): Promise<void> {
        patchState(store, { loading: true, errorKey: null });

        try {
          await savedTradersApi.remove(id);
          patchState(store, { traders: store.traders().filter((trader) => trader.id !== id) });
        } catch {
          patchState(store, { errorKey: 'savedTradersGenericError' });
        } finally {
          patchState(store, { loading: false });
        }
      },
    }),
  ),
);

function parseTraderAddress(value: string): string | null {
  return value.trim().match(/0x[a-fA-F0-9]{40}/)?.[0].toLowerCase() ?? null;
}
