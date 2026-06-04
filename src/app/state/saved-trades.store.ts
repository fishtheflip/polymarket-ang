import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { SavedTrade, SavedTradesService } from '../saved-trades.service';
import { SupabaseAuthService } from '../supabase-auth.service';

export type SavedTradesErrorKey =
  | 'savedTradesDuplicate'
  | 'savedTradesGenericError'
  | 'savedTradesInvalidLink'
  | 'savedTradesLimitReached';

type SavedTradesState = {
  trades: SavedTrade[];
  linkInput: string;
  loading: boolean;
  errorKey: SavedTradesErrorKey | null;
};

const maxSavedTrades = 20;

const initialState: SavedTradesState = {
  trades: [],
  linkInput: '',
  loading: false,
  errorKey: null,
};

export const SavedTradesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ trades }) => ({
    remainingSlots: computed(() => maxSavedTrades - trades().length),
    isAtLimit: computed(() => trades().length >= maxSavedTrades),
  })),
  withMethods(
    (
      store,
      savedTradesApi = inject(SavedTradesService),
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
            patchState(store, { trades: [], linkInput: '', errorKey: null });
          }
        });

        void this.load();
      },

      setLinkInput(linkInput: string): void {
        patchState(store, { linkInput, errorKey: null });
      },

      async load(): Promise<void> {
        patchState(store, { loading: true, errorKey: null });

        try {
          const trades = await savedTradesApi.list();
          patchState(store, { trades });
        } catch {
          patchState(store, { trades: [], errorKey: 'savedTradesGenericError' });
        } finally {
          patchState(store, { loading: false });
        }
      },

      async save(): Promise<void> {
        const parsedLink = parsePolymarketLink(store.linkInput());

        if (!parsedLink) {
          patchState(store, { errorKey: 'savedTradesInvalidLink' });
          return;
        }

        if (store.isAtLimit()) {
          patchState(store, { errorKey: 'savedTradesLimitReached' });
          return;
        }

        if (store.trades().some((trade) => trade.url === parsedLink.url)) {
          patchState(store, { errorKey: 'savedTradesDuplicate' });
          return;
        }

        patchState(store, { loading: true, errorKey: null });

        try {
          const trade = await savedTradesApi.create(parsedLink.url, parsedLink.title);
          patchState(store, { trades: [trade, ...store.trades()], linkInput: '' });
        } catch {
          patchState(store, { errorKey: 'savedTradesGenericError' });
        } finally {
          patchState(store, { loading: false });
        }
      },

      async remove(id: string): Promise<void> {
        patchState(store, { loading: true, errorKey: null });

        try {
          await savedTradesApi.remove(id);
          patchState(store, { trades: store.trades().filter((trade) => trade.id !== id) });
        } catch {
          patchState(store, { errorKey: 'savedTradesGenericError' });
        } finally {
          patchState(store, { loading: false });
        }
      },
    }),
  ),
);

function parsePolymarketLink(value: string): { url: string; title: string } | null {
  try {
    const url = new URL(value.trim());

    if (url.protocol !== 'https:' || !/(^|\.)polymarket\.com$/i.test(url.hostname)) {
      return null;
    }

    const parts = url.pathname.split('/').filter(Boolean);
    const slug = parts.at(-1);

    if (!slug) {
      return null;
    }

    url.hash = '';
    return {
      url: url.toString(),
      title: slug.replace(/-/g, ' '),
    };
  } catch {
    return null;
  }
}
