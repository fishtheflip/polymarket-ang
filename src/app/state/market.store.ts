import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { I18nService } from '../i18n.service';
import { GammaMarket, PolymarketMarketService } from '../polymarket-market.service';

export type MarketOverviewRow = {
  title: string;
  category: string;
  url: string | null;
  probability: number;
  volume: string;
  detail: string;
  side: string;
  liquidity: number;
};

type MarketState = {
  markets: GammaMarket[];
  loading: boolean;
  error: string | null;
};

const initialState: MarketState = {
  markets: [],
  loading: false,
  error: null,
};

export const MarketStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ markets }, i18n = inject(I18nService)) => {
    const rows = computed(() => {
      const marketList = markets();
      const maxLiquidity = Math.max(...marketList.map((market) => numberOrZero(market.liquidityNum)), 1);

      return marketList.slice(0, 10).map((market): MarketOverviewRow => {
        const outcomes = parseStringArray(market.outcomes);
        const prices = parseStringArray(market.outcomePrices).map(Number);
        const leadingIndex = prices[1] > prices[0] ? 1 : 0;
        const probability = Math.round(numberOrZero(prices[leadingIndex]) * 100);
        const liquidity = Math.round((numberOrZero(market.liquidityNum) / maxLiquidity) * 100);

        return {
          title: market.question,
          category: marketCategory(market),
          url: marketUrl(market),
          probability,
          volume: formatCompactCurrency(numberOrZero(market.volumeNum)),
          detail: `${formatCompactCurrency(numberOrZero(market.volume24hr))} 24h`,
          side: outcomes[leadingIndex] ?? 'Yes',
          liquidity,
        };
      });
    });

    return {
      rows,
      stats: computed(() => {
        const marketList = markets();
        const totalVolume = marketList.reduce((total, market) => total + numberOrZero(market.volumeNum), 0);
        const volume24h = marketList.reduce((total, market) => total + numberOrZero(market.volume24hr), 0);
        const avgLiquidity = marketList.length
          ? marketList.reduce((total, market) => total + numberOrZero(market.liquidityNum), 0) / marketList.length
          : 0;

        return [
          { label: i18n.t('trackedVolume'), value: formatCompactCurrency(totalVolume), delta: 'Gamma API', icon: 'monitoring' },
          { label: i18n.t('activeMarkets'), value: String(marketList.length), delta: i18n.t('activeOpen'), icon: 'stacked_line_chart' },
          { label: i18n.t('twentyFourHourVolume'), value: formatCompactCurrency(volume24h), delta: i18n.t('realTime'), icon: 'query_stats' },
          { label: i18n.t('avgLiquidity'), value: formatCompactCurrency(avgLiquidity), delta: 'Gamma API', icon: 'notifications_active' },
        ];
      }),
      mix: computed(() => {
        const totals = new Map<string, number>();

        markets().forEach((market) => {
          const category = marketCategory(market);
          totals.set(category, (totals.get(category) ?? 0) + numberOrZero(market.volume24hr));
        });

        const mixRows = [...totals.entries()]
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 4);
        const total = mixRows.reduce((sum, row) => sum + row.value, 0);

        return mixRows.map((row) => ({
          label: row.label,
          percent: total > 0 ? Math.round((row.value / total) * 100) : 0,
        }));
      }),
      signalScore: computed(() => {
        const marketRows = rows();

        if (!marketRows.length) {
          return 0;
        }

        return Math.round(marketRows.reduce((total, row) => total + row.probability, 0) / marketRows.length);
      }),
      insights: computed(() =>
        rows()
          .slice(0, 3)
          .map((market) => ({
            action: `${market.probability}% ${market.side}`,
            market: market.title,
            value: market.detail,
          })),
      ),
    };
  }),
  withMethods((store, marketApi = inject(PolymarketMarketService)) => ({
    async loadMarkets(): Promise<void> {
      patchState(store, { loading: true, error: null });

      try {
        const markets = await marketApi.getTopMarkets();
        patchState(store, { markets });
      } catch (error) {
        patchState(store, { error: error instanceof Error ? error.message : 'Could not load market overview.' });
      } finally {
        patchState(store, { loading: false });
      }
    },
  })),
);

function numberOrZero(value: number | null | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function marketCategory(market: GammaMarket): string {
  return market.tags?.[0]?.label || market.events?.[0]?.tags?.[0]?.label || market.events?.[0]?.category || 'Other';
}

function marketUrl(market: GammaMarket): string | null {
  return market.slug ? `https://polymarket.com/market/${market.slug}` : null;
}

function formatCompactCurrency(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
