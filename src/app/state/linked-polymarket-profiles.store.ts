import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { PolymarketAccountService } from '../polymarket-account.service';
import {
  LinkedPolymarketProfile,
  LinkedPolymarketProfilesService,
} from '../linked-polymarket-profiles.service';
import { SupabaseAuthService } from '../supabase-auth.service';

export type LinkedPolymarketProfilesErrorKey =
  | 'linkedProfilesGenericError'
  | 'linkedProfilesInvalidAddress';

type LinkedPolymarketProfilesState = {
  profile: LinkedPolymarketProfile | null;
  addressInput: string;
  loading: boolean;
  errorKey: LinkedPolymarketProfilesErrorKey | null;
};

const initialState: LinkedPolymarketProfilesState = {
  profile: null,
  addressInput: '',
  loading: false,
  errorKey: null,
};

export const LinkedPolymarketProfilesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods(
    (
      store,
      linkedProfilesApi = inject(LinkedPolymarketProfilesService),
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
            patchState(store, { profile: null, addressInput: '', errorKey: null });
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
          const profile = await linkedProfilesApi.getCurrent();
          patchState(store, { profile });
        } catch {
          patchState(store, { profile: null, errorKey: 'linkedProfilesGenericError' });
        } finally {
          patchState(store, { loading: false });
        }
      },

      async add(): Promise<void> {
        const address = parsePolymarketAddress(store.addressInput());

        if (!address) {
          patchState(store, { errorKey: 'linkedProfilesInvalidAddress' });
          return;
        }

        patchState(store, { loading: true, errorKey: null });

        try {
          const polymarketProfile = await polymarketApi.getProfile(address);
          const linkedProfile = await linkedProfilesApi.upsert(address, polymarketProfile);
          patchState(store, { profile: linkedProfile, addressInput: '' });
        } catch {
          patchState(store, { errorKey: 'linkedProfilesGenericError' });
        } finally {
          patchState(store, { loading: false });
        }
      },

      async remove(id: string): Promise<void> {
        patchState(store, { loading: true, errorKey: null });

        try {
          await linkedProfilesApi.remove(id);
          patchState(store, { profile: null });
        } catch {
          patchState(store, { errorKey: 'linkedProfilesGenericError' });
        } finally {
          patchState(store, { loading: false });
        }
      },
    }),
  ),
);

function parsePolymarketAddress(value: string): string | null {
  const trimmed = value.trim();
  const addressMatch = trimmed.match(/0x[a-fA-F0-9]{40}/);

  return addressMatch?.[0] ?? null;
}
