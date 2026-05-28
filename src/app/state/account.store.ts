import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  PolymarketAccountService,
  PolymarketActivity,
  PolymarketPosition,
  PolymarketProfile,
  PolymarketTrade,
} from '../polymarket-account.service';

type AccountState = {
  address: string;
  loading: boolean;
  error: string | null;
  loadedAddress: string | null;
  profile: PolymarketProfile | null;
  positions: PolymarketPosition[];
  closedPositions: PolymarketPosition[];
  activity: PolymarketActivity[];
  trades: PolymarketTrade[];
  tradedMarkets: number | null;
  positionValue: number | null;
};

const initialState: AccountState = {
  address: '',
  loading: false,
  error: null,
  loadedAddress: null,
  profile: null,
  positions: [],
  closedPositions: [],
  activity: [],
  trades: [],
  tradedMarkets: null,
  positionValue: null,
};

export const AccountStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ address, positionValue, positions, closedPositions, activity, trades, profile }) => ({
    isValidAddress: () => isAddress(address().trim()),
    currentValue: computed(
      () => positionValue() ?? positions().reduce((total, position) => total + numberOrZero(position.currentValue), 0),
    ),
    initialValue: computed(() => positions().reduce((total, position) => total + numberOrZero(position.initialValue), 0)),
    openPnl: computed(() => positions().reduce((total, position) => total + numberOrZero(position.cashPnl), 0)),
    realizedPnl: computed(() =>
      closedPositions().reduce((total, position) => total + numberOrZero(position.realizedPnl), 0),
    ),
    topPositions: computed(() => positions().slice(0, 10)),
    topClosedPositions: computed(() => closedPositions().slice(0, 5)),
    recentActivity: computed(() => activity().slice(0, 8)),
    recentTrades: computed(() => trades().slice(0, 8)),
    displayName: computed(() => profile()?.name || profile()?.pseudonym || 'Polymarket account'),
  })),
  withMethods((store, accountApi = inject(PolymarketAccountService)) => ({
    setAddress(address: string): void {
      patchState(store, { address });
    },

    setError(error: string | null): void {
      patchState(store, { error });
    },

    async loadAccount(): Promise<void> {
      const address = store.address().trim();

      if (!isAddress(address)) {
        return;
      }

      patchState(store, { loading: true, error: null });

      try {
        const [profile, positions, closedPositions, activity, trades, tradedMarkets, value] = await Promise.all([
          resolveOrDefault(accountApi.getProfile(address), null),
          resolveOrDefault(accountApi.getPositions(address), []),
          resolveOrDefault(accountApi.getClosedPositions(address), []),
          resolveOrDefault(accountApi.getActivity(address), []),
          resolveOrDefault(accountApi.getTrades(address), []),
          resolveOrDefault(accountApi.getTradedMarketsCount(address), null),
          resolveOrDefault(accountApi.getPositionValue(address), null),
        ]);

        patchState(store, {
          profile,
          positions,
          closedPositions,
          activity,
          trades,
          tradedMarkets,
          positionValue: value,
          loadedAddress: address,
        });
      } catch (error) {
        patchState(store, { error: error instanceof Error ? error.message : 'Could not load account data.' });
      } finally {
        patchState(store, { loading: false });
      }
    },
  })),
);

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function numberOrZero(value: number | null | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

async function resolveOrDefault<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}
