import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { PolymarketAccountService, PolymarketTrade } from '../polymarket-account.service';

export type WhaleFeedMode = 'large' | 'risky';

export type WhaleMovement = {
  id: string;
  address: string;
  name: string;
  title: string;
  detail: string;
  value: number;
  price: number;
  timestamp: number | null;
  isNegative: boolean;
  url: string | null;
};

type WhaleState = {
  trades: PolymarketTrade[];
  loading: boolean;
  error: string | null;
  copyFailed: boolean;
  copyFallbackAddress: string | null;
  copiedTraderKey: string | null;
  mode: WhaleFeedMode;
};

const initialState: WhaleState = {
  trades: [],
  loading: false,
  error: null,
  copyFailed: false,
  copyFallbackAddress: null,
  copiedTraderKey: null,
  mode: 'large',
};

export const WhaleStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ trades, mode }) => {
    const whaleMovements = computed(() =>
      trades()
        .map((trade) => tradeToWhaleMovement(trade))
        .filter((movement) => movement.value > 0)
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

    return {
      whaleMovements,
      riskyWhaleMovements,
      selectedMovements: computed(() => (mode() === 'risky' ? riskyWhaleMovements() : whaleMovements())),
    };
  }),
  withMethods((store, accountApi = inject(PolymarketAccountService)) => ({
    setMode(mode: WhaleFeedMode): void {
      patchState(store, { mode });
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
  })),
);

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
