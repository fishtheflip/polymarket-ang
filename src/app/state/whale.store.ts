import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { PolymarketAccountService, PolymarketTrade } from '../polymarket-account.service';

export type WhaleFeedMode = 'large' | 'risky';
export type WhaleSideFilter = 'all' | 'buy' | 'sell';

export type WhaleMovement = {
  id: string;
  address: string;
  name: string;
  slug: string | null;
  title: string;
  detail: string;
  value: number;
  price: number;
  timestamp: number | null;
  isNegative: boolean;
  url: string | null;
};

export type MarketParticipant = {
  id: string;
  address: string;
  name: string;
  outcome: string;
  buyValue: number;
  sellValue: number;
  netValue: number;
  netShares: number;
  trades: number;
  lastTimestamp: number | null;
};

type WhaleState = {
  trades: PolymarketTrade[];
  loading: boolean;
  error: string | null;
  copyFailed: boolean;
  copyFallbackAddress: string | null;
  copiedTraderKey: string | null;
  copiedMarketSlugKey: string | null;
  mode: WhaleFeedMode;
  largeSideFilter: WhaleSideFilter;
  watchedMarketInput: string;
  watchedMarketSlug: string | null;
};

const initialState: WhaleState = {
  trades: [],
  loading: false,
  error: null,
  copyFailed: false,
  copyFallbackAddress: null,
  copiedTraderKey: null,
  copiedMarketSlugKey: null,
  mode: 'large',
  largeSideFilter: 'all',
  watchedMarketInput: '',
  watchedMarketSlug: null,
};

export const WhaleStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ trades, mode, largeSideFilter, watchedMarketSlug }) => {
    const whaleMovements = computed(() =>
      trades()
        .map((trade) => tradeToWhaleMovement(trade))
        .filter((movement) => movement.value > 0)
        .filter((movement) => matchesSideFilter(movement, largeSideFilter()))
        .sort((a, b) => b.value - a.value || numberOrZero(b.timestamp) - numberOrZero(a.timestamp))
        .slice(0, 10),
    );
    const riskyWhaleMovements = computed(() =>
      trades()
        .map((trade) => tradeToWhaleMovement(trade))
        .filter((movement) => movement.value >= 500 && movement.price > 0 && movement.price <= 0.25)
        .sort((a, b) => b.value - a.value || a.price - b.price || numberOrZero(b.timestamp) - numberOrZero(a.timestamp))
        .slice(0, 10),
    );
    const watchedMarketTrades = computed(() => {
      const slug = watchedMarketSlug();

      if (!slug) {
        return [];
      }

      return trades()
        .filter((trade) => trade.slug === slug || trade.eventSlug === slug)
        .map((trade) => tradeToWhaleMovement(trade))
        .filter((movement) => movement.value > 0)
        .sort((a, b) => numberOrZero(b.timestamp) - numberOrZero(a.timestamp));
    });
    const watchedMarketParticipants = computed(() =>
      buildMarketParticipants(
        trades().filter((trade) => {
          const slug = watchedMarketSlug();
          return !!slug && (trade.slug === slug || trade.eventSlug === slug);
        }),
      ),
    );

    return {
      whaleMovements,
      riskyWhaleMovements,
      selectedMovements: computed(() => (mode() === 'risky' ? riskyWhaleMovements() : whaleMovements())),
      watchedMarketTrades,
      watchedMarketParticipants,
    };
  }),
  withMethods((store, accountApi = inject(PolymarketAccountService)) => ({
    setMode(mode: WhaleFeedMode): void {
      patchState(store, { mode });
    },

    setLargeSideFilter(largeSideFilter: WhaleSideFilter): void {
      patchState(store, { largeSideFilter });
    },

    setWatchedMarketInput(watchedMarketInput: string): void {
      patchState(store, { watchedMarketInput, error: null });
    },

    async watchMarket(): Promise<void> {
      const watchedMarketSlug = extractMarketSlug(store.watchedMarketInput());

      if (!watchedMarketSlug) {
        patchState(store, { error: 'Paste a valid Polymarket market link or slug.' });
        return;
      }

      patchState(store, { watchedMarketSlug, error: null });

      if (!store.trades().length) {
        await this.loadTrades();
      }
    },

    clearWatchedMarket(): void {
      patchState(store, {
        watchedMarketInput: '',
        watchedMarketSlug: null,
        error: null,
      });
    },

    async loadTrades(): Promise<void> {
      patchState(store, {
        loading: true,
        error: null,
        copyFailed: false,
        copyFallbackAddress: null,
      });

      try {
        const trades = await accountApi.getRecentTrades(10000);
        patchState(store, { trades });
      } catch (error) {
        patchState(store, { error: error instanceof Error ? error.message : 'Could not load whale data.' });
      } finally {
        patchState(store, { loading: false });
      }
    },

    async copyTraderAddress(address: string, movementId: string): Promise<void> {
      if (!address) {
        return;
      }

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(address);
        } else {
          copyTextFallback(address);
        }

        patchState(store, {
          copiedTraderKey: movementId,
          copyFailed: false,
          copyFallbackAddress: null,
          error: null,
        });
      } catch {
        try {
          copyTextFallback(address);
          patchState(store, {
            copiedTraderKey: movementId,
            copyFailed: false,
            copyFallbackAddress: null,
            error: null,
          });
        } catch {
          patchState(store, {
            copyFailed: true,
            copyFallbackAddress: address,
          });
        }
      }
    },

    async copyMarketSlug(slug: string | null, movementId: string): Promise<void> {
      if (!slug) {
        return;
      }

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(slug);
        } else {
          copyTextFallback(slug);
        }

        patchState(store, {
          copiedMarketSlugKey: movementId,
          copyFailed: false,
          copyFallbackAddress: null,
          error: null,
        });
      } catch {
        try {
          copyTextFallback(slug);
          patchState(store, {
            copiedMarketSlugKey: movementId,
            copyFailed: false,
            copyFallbackAddress: null,
            error: null,
          });
        } catch {
          patchState(store, {
            copyFailed: true,
            copyFallbackAddress: slug,
          });
        }
      }
    },
  })),
);

function buildMarketParticipants(trades: PolymarketTrade[]): MarketParticipant[] {
  const participants = new Map<string, MarketParticipant>();

  trades.forEach((trade) => {
    const address = trade.proxyWallet ?? '';

    if (!address) {
      return;
    }

    const value = tradeValue(trade);
    const shares = numberOrZero(trade.size);
    const isSell = trade.side?.toLowerCase() === 'sell';
    const existing = participants.get(address) ?? {
      id: address,
      address,
      name: trade.name || trade.pseudonym || shortAddress(address),
      outcome: trade.outcome || '--',
      buyValue: 0,
      sellValue: 0,
      netValue: 0,
      netShares: 0,
      trades: 0,
      lastTimestamp: null,
    };

    existing.name = trade.name || trade.pseudonym || existing.name;
    existing.outcome = trade.outcome || existing.outcome;
    existing.trades += 1;
    existing.lastTimestamp = Math.max(numberOrZero(existing.lastTimestamp), numberOrZero(trade.timestamp)) || null;

    if (isSell) {
      existing.sellValue += value;
      existing.netValue -= value;
      existing.netShares -= shares;
    } else {
      existing.buyValue += value;
      existing.netValue += value;
      existing.netShares += shares;
    }

    participants.set(address, existing);
  });

  return [...participants.values()]
    .sort((a, b) => Math.abs(b.netValue) - Math.abs(a.netValue) || b.trades - a.trades)
    .slice(0, 20);
}

function tradeToWhaleMovement(trade: PolymarketTrade): WhaleMovement {
  const value = tradeValue(trade);
  const address = trade.proxyWallet ?? '';
  const id = [
    trade.transactionHash || 'no-transaction',
    address,
    trade.timestamp,
    trade.slug,
    trade.outcome,
    trade.side,
    trade.price,
    trade.size,
    value,
  ].join('|');

  return {
    id,
    address,
    name: trade.name || trade.pseudonym || shortAddress(address),
    slug: trade.slug ?? null,
    title: trade.title || trade.slug || 'Polymarket market',
    detail: `${trade.side || 'Trade'} ${trade.outcome || ''} · ${formatPrice(trade.price)} · ${formatNumber(trade.size)} shares`,
    value,
    price: numberOrZero(trade.price),
    timestamp: trade.timestamp ?? null,
    isNegative: trade.side?.toLowerCase() === 'sell',
    url: polymarketUrl(trade.slug),
  };
}

function tradeValue(trade: PolymarketTrade): number {
  return numberOrZero(trade.usdcSize) || numberOrZero(trade.size) * numberOrZero(trade.price);
}

function matchesSideFilter(movement: WhaleMovement, filter: WhaleSideFilter): boolean {
  if (filter === 'all') {
    return true;
  }

  return filter === 'sell' ? movement.isNegative : !movement.isNegative;
}

function numberOrZero(value: number | null | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

function formatNumber(value: number | null | undefined): string {
  return numberOrZero(value).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatPrice(value: number | null | undefined): string {
  return numberOrZero(value).toFixed(3);
}

function shortAddress(address: string | null | undefined): string {
  if (!address) {
    return '--';
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function polymarketUrl(slug: string | null | undefined): string | null {
  return slug ? `https://polymarket.com/market/${slug}` : null;
}

function extractMarketSlug(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split('/').filter(Boolean);
    const marketIndex = segments.findIndex((segment) => segment === 'market' || segment === 'event');
    return sanitizeSlug(segments[marketIndex + 1] ?? segments.at(-1) ?? '');
  } catch {
    return sanitizeSlug(trimmed);
  }
}

function sanitizeSlug(value: string): string | null {
  const slug = value.trim().replace(/^\/+|\/+$/g, '').split(/[?#]/)[0];

  return /^[a-z0-9][a-z0-9-]*$/i.test(slug) ? slug : null;
}

function copyTextFallback(value: string): void {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error('Copy command failed.');
  }
}
