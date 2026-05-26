import { Component, OnInit, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  PolymarketActivity,
  PolymarketAccountService,
  PolymarketPosition,
  PolymarketProfile,
  PolymarketTrade,
} from './polymarket-account.service';
import { I18nService, Language } from './i18n.service';
import { GammaMarket, PolymarketMarketService } from './polymarket-market.service';

type ThemeMode = 'light' | 'dark';
type WhaleFeedMode = 'large' | 'risky';

type DonutSegment = {
  label: string;
  value: number;
  formattedValue: string;
  percent: number;
  path: string;
  color: string;
  isNegative: boolean;
};

type ChartTooltip = {
  label: string;
  value: string;
  percent: string;
  x: number;
  y: number;
};

type DonutChart = {
  title: string;
  subtitle: string;
  total: number;
  formattedTotal: string;
  segments: DonutSegment[];
};

type MarketOverviewRow = {
  title: string;
  category: string;
  url: string | null;
  probability: number;
  volume: string;
  detail: string;
  side: string;
  liquidity: number;
};

type WhaleMovement = {
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

@Component({
  selector: 'app-root',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatProgressBarModule,
    MatTabsModule,
    MatToolbarModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly accountAddress = signal('');
  protected readonly accountError = signal<string | null>(null);
  protected readonly accountLoading = signal(false);
  protected readonly loadedAddress = signal<string | null>(null);
  protected readonly profile = signal<PolymarketProfile | null>(null);
  protected readonly positions = signal<PolymarketPosition[]>([]);
  protected readonly closedPositions = signal<PolymarketPosition[]>([]);
  protected readonly activity = signal<PolymarketActivity[]>([]);
  protected readonly trades = signal<PolymarketTrade[]>([]);
  protected readonly tradedMarkets = signal<number | null>(null);
  protected readonly positionValue = signal<number | null>(null);
  protected readonly chartTooltip = signal<ChartTooltip | null>(null);
  protected readonly marketOverviewLoading = signal(false);
  protected readonly marketOverviewError = signal<string | null>(null);
  protected readonly marketOverviewMarkets = signal<GammaMarket[]>([]);
  protected readonly whaleLoading = signal(false);
  protected readonly whaleError = signal<string | null>(null);
  protected readonly whaleTrades = signal<PolymarketTrade[]>([]);
  protected readonly copiedTraderAddress = signal<string | null>(null);
  protected readonly themeMode = signal<ThemeMode>('dark');
  protected readonly whaleFeedMode = signal<WhaleFeedMode>('large');

  protected readonly isValidAddress = computed(() => this.isAddress(this.accountAddress().trim()));
  protected readonly isDarkTheme = computed(() => this.themeMode() === 'dark');
  protected readonly currentValue = computed(
    () => this.positionValue() ?? this.positions().reduce((total, position) => total + this.numberOrZero(position.currentValue), 0),
  );
  protected readonly initialValue = computed(() =>
    this.positions().reduce((total, position) => total + this.numberOrZero(position.initialValue), 0),
  );
  protected readonly openPnl = computed(() =>
    this.positions().reduce((total, position) => total + this.numberOrZero(position.cashPnl), 0),
  );
  protected readonly realizedPnl = computed(() =>
    this.closedPositions().reduce((total, position) => total + this.numberOrZero(position.realizedPnl), 0),
  );
  protected readonly currentPositionsChart = computed(() =>
    this.createDonutChart({
      title: this.t('currentPositionsMix'),
      subtitle: this.t('allocationByCurrentValue'),
      items: this.positions(),
      valueAccessor: (position) => this.numberOrZero(position.currentValue),
      labelAccessor: (position) => position.title || this.t('position'),
      formatter: (value) => this.formatCurrency(value),
    }),
  );
  protected readonly closedPositionsChart = computed(() =>
    this.createPnlDonutChart({
      title: this.t('closedPositionsPnl'),
      subtitle: this.t('realizedPnlByMarket'),
      items: this.closedPositions(),
      labelAccessor: (position) => position.title || this.t('closedPositions'),
    }),
  );
  protected readonly marketRows = computed(() => {
    const markets = this.marketOverviewMarkets();
    const maxLiquidity = Math.max(...markets.map((market) => this.numberOrZero(market.liquidityNum)), 1);

    return markets.slice(0, 10).map((market): MarketOverviewRow => {
      const outcomes = this.parseStringArray(market.outcomes);
      const prices = this.parseStringArray(market.outcomePrices).map(Number);
      const leadingIndex = prices[1] > prices[0] ? 1 : 0;
      const probability = Math.round(this.numberOrZero(prices[leadingIndex]) * 100);
      const liquidity = Math.round((this.numberOrZero(market.liquidityNum) / maxLiquidity) * 100);

      return {
        title: market.question,
        category: this.marketCategory(market),
        url: this.marketUrl(market),
        probability,
        volume: this.formatCompactCurrency(this.numberOrZero(market.volumeNum)),
        detail: `${this.formatCompactCurrency(this.numberOrZero(market.volume24hr))} 24h`,
        side: outcomes[leadingIndex] ?? 'Yes',
        liquidity,
      };
    });
  });
  protected readonly marketStats = computed(() => {
    const markets = this.marketOverviewMarkets();
    const totalVolume = markets.reduce((total, market) => total + this.numberOrZero(market.volumeNum), 0);
    const volume24h = markets.reduce((total, market) => total + this.numberOrZero(market.volume24hr), 0);
    const avgLiquidity = markets.length
      ? markets.reduce((total, market) => total + this.numberOrZero(market.liquidityNum), 0) / markets.length
      : 0;

    return [
      { label: this.t('trackedVolume'), value: this.formatCompactCurrency(totalVolume), delta: 'Gamma API', icon: 'monitoring' },
      { label: this.t('activeMarkets'), value: String(markets.length), delta: this.t('activeOpen'), icon: 'stacked_line_chart' },
      { label: this.t('twentyFourHourVolume'), value: this.formatCompactCurrency(volume24h), delta: this.t('realTime'), icon: 'query_stats' },
      { label: this.t('avgLiquidity'), value: this.formatCompactCurrency(avgLiquidity), delta: 'Gamma API', icon: 'notifications_active' },
    ];
  });
  protected readonly marketMix = computed(() => {
    const totals = new Map<string, number>();

    this.marketOverviewMarkets().forEach((market) => {
      const category = this.marketCategory(market);
      totals.set(category, (totals.get(category) ?? 0) + this.numberOrZero(market.volume24hr));
    });

    const rows = [...totals.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
    const total = rows.reduce((sum, row) => sum + row.value, 0);

    return rows.map((row) => ({
      label: row.label,
      percent: total > 0 ? Math.round((row.value / total) * 100) : 0,
    }));
  });
  protected readonly marketSignalScore = computed(() => {
    const rows = this.marketRows();

    if (!rows.length) {
      return 0;
    }

    return Math.round(rows.reduce((total, row) => total + row.probability, 0) / rows.length);
  });
  protected readonly marketInsights = computed(() =>
    this.marketRows()
      .slice(0, 3)
      .map((market) => ({
        action: `${market.probability}% ${market.side}`,
        market: market.title,
        value: market.detail,
      })),
  );
  protected readonly whaleMovements = computed((): WhaleMovement[] => {
    return this.whaleTrades()
      .map((trade) => this.tradeToWhaleMovement(trade))
      .filter((movement) => movement.value > 0)
      .sort((a, b) => b.value - a.value || this.numberOrZero(b.timestamp) - this.numberOrZero(a.timestamp))
      .slice(0, 10);
  });
  protected readonly riskyWhaleMovements = computed((): WhaleMovement[] => {
    return this.whaleTrades()
      .map((trade) => this.tradeToWhaleMovement(trade))
      .filter((movement) => movement.value > 0 && movement.price > 0 && movement.price <= 0.25)
      .sort((a, b) => b.value - a.value || a.price - b.price || this.numberOrZero(b.timestamp) - this.numberOrZero(a.timestamp))
      .slice(0, 10);
  });
  protected readonly selectedWhaleMovements = computed(() =>
    this.whaleFeedMode() === 'risky' ? this.riskyWhaleMovements() : this.whaleMovements(),
  );
  protected readonly selectedWhaleFeedTitle = computed(() =>
    this.whaleFeedMode() === 'risky' ? this.t('riskyWhaleFeed') : this.t('whaleFeed'),
  );
  protected readonly selectedWhaleFeedSubtitle = computed(() =>
    this.whaleFeedMode() === 'risky' ? this.t('riskyWhaleFeedSubtitle') : this.t('whaleFeedSubtitle'),
  );

  constructor(
    private readonly accountApi: PolymarketAccountService,
    private readonly marketApi: PolymarketMarketService,
    protected readonly i18n: I18nService,
  ) {}

  ngOnInit(): void {
    void this.loadMarketOverview();
    void this.loadWhaleTrades();
  }

  protected t(key: Parameters<I18nService['t']>[0]): string {
    return this.i18n.t(key);
  }

  protected setLanguage(language: Language): void {
    this.i18n.setLanguage(language);
  }

  protected toggleTheme(): void {
    this.themeMode.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }

  protected setWhaleFeedMode(mode: WhaleFeedMode): void {
    this.whaleFeedMode.set(mode);
  }

  protected async loadAccount(): Promise<void> {
    const address = this.accountAddress().trim();

    if (!this.isAddress(address)) {
      this.accountError.set(this.t('useValidAddress'));
      return;
    }

    this.accountLoading.set(true);
    this.accountError.set(null);

    try {
      const [profile, positions, closedPositions, activity, trades, tradedMarkets, value] = await Promise.all([
        this.resolveOrDefault(this.accountApi.getProfile(address), null),
        this.resolveOrDefault(this.accountApi.getPositions(address), []),
        this.resolveOrDefault(this.accountApi.getClosedPositions(address), []),
        this.resolveOrDefault(this.accountApi.getActivity(address), []),
        this.resolveOrDefault(this.accountApi.getTrades(address), []),
        this.resolveOrDefault(this.accountApi.getTradedMarketsCount(address), null),
        this.resolveOrDefault(this.accountApi.getPositionValue(address), null),
      ]);

      this.profile.set(profile);
      this.positions.set(positions);
      this.closedPositions.set(closedPositions);
      this.activity.set(activity);
      this.trades.set(trades);
      this.tradedMarkets.set(tradedMarkets);
      this.positionValue.set(value);
      this.loadedAddress.set(address);
    } catch (error) {
      this.accountError.set(error instanceof Error ? error.message : 'Could not load account data.');
    } finally {
      this.accountLoading.set(false);
    }
  }

  protected async loadMarketOverview(): Promise<void> {
    this.marketOverviewLoading.set(true);
    this.marketOverviewError.set(null);

    try {
      this.marketOverviewMarkets.set(await this.marketApi.getTopMarkets());
    } catch (error) {
      this.marketOverviewError.set(error instanceof Error ? error.message : 'Could not load market overview.');
    } finally {
      this.marketOverviewLoading.set(false);
    }
  }

  protected async loadWhaleTrades(): Promise<void> {
    this.whaleLoading.set(true);
    this.whaleError.set(null);

    try {
      this.whaleTrades.set(await this.accountApi.getRecentTrades(250));
    } catch (error) {
      this.whaleError.set(error instanceof Error ? error.message : 'Could not load whale data.');
    } finally {
      this.whaleLoading.set(false);
    }
  }

  protected async copyTraderAddress(address: string): Promise<void> {
    if (!address) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(address);
      } else {
        this.copyTextFallback(address);
      }
      this.copiedTraderAddress.set(address);
      this.whaleError.set(null);
    } catch {
      try {
        this.copyTextFallback(address);
        this.copiedTraderAddress.set(address);
        this.whaleError.set(null);
      } catch {
        this.whaleError.set(this.t('copyFailed'));
      }
    }
  }

  protected topPositions(): PolymarketPosition[] {
    return this.positions().slice(0, 10);
  }

  protected topClosedPositions(): PolymarketPosition[] {
    return this.closedPositions().slice(0, 5);
  }

  protected recentActivity(): PolymarketActivity[] {
    return this.activity().slice(0, 8);
  }

  protected recentTrades(): PolymarketTrade[] {
    return this.trades().slice(0, 8);
  }

  protected displayName(): string {
    const profile = this.profile();

    return profile?.name || profile?.pseudonym || 'Polymarket account';
  }

  protected shortAddress(address: string | null): string {
    if (!address) {
      return 'No address loaded';
    }

    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  protected formatCurrency(value: number | null | undefined): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '--';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  }

  protected formatCompactCurrency(value: number | null | undefined): string {
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

  protected formatPercent(value: number | null | undefined): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '--';
    }

    return `${value.toFixed(2)}%`;
  }

  protected formatPrice(value: number | null | undefined): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '--';
    }

    return value.toFixed(3);
  }

  protected formatNumber(value: number | null | undefined): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '--';
    }

    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(value);
  }

  protected formatDate(value: number | string | null | undefined): string {
    if (!value) {
      return '--';
    }

    const timestamp = typeof value === 'number' && value < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return '--';
    }

    return new Intl.DateTimeFormat(this.i18n.language() === 'ru' ? 'ru-RU' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  protected showChartTooltip(event: MouseEvent, segment: DonutSegment): void {
    this.chartTooltip.set({
      label: segment.label,
      value: segment.formattedValue,
      percent: this.formatPercent(segment.percent),
      x: event.clientX + 14,
      y: event.clientY + 14,
    });
  }

  protected hideChartTooltip(): void {
    this.chartTooltip.set(null);
  }

  private isAddress(value: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(value);
  }

  private numberOrZero(value: number | null | undefined): number {
    return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  }

  private tradeValue(trade: PolymarketTrade): number {
    return this.numberOrZero(trade.usdcSize) || this.numberOrZero(trade.size) * this.numberOrZero(trade.price);
  }

  private tradeToWhaleMovement(trade: PolymarketTrade): WhaleMovement {
    const value = this.tradeValue(trade);
    const address = trade.proxyWallet ?? '';

    return {
      address,
      name: trade.name || trade.pseudonym || this.shortAddress(address),
      title: trade.title || trade.slug || 'Polymarket market',
      detail: `${trade.side || 'Trade'} ${trade.outcome || ''} · ${this.formatPrice(trade.price)} · ${this.formatNumber(trade.size)} shares`,
      value,
      price: this.numberOrZero(trade.price),
      timestamp: trade.timestamp ?? null,
      isNegative: trade.side?.toLowerCase() === 'sell',
      url: this.polymarketUrl(trade.slug),
    };
  }

  private copyTextFallback(value: string): void {
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

  private parseStringArray(value: string): string[] {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  private marketCategory(market: GammaMarket): string {
    return (
      market.tags?.[0]?.label ||
      market.events?.[0]?.tags?.[0]?.label ||
      market.events?.[0]?.category ||
      'Other'
    );
  }

  private marketUrl(market: GammaMarket): string | null {
    return market.slug ? `https://polymarket.com/market/${market.slug}` : null;
  }

  private polymarketUrl(slug: string | null | undefined): string | null {
    return slug ? `https://polymarket.com/market/${slug}` : null;
  }

  private async resolveOrDefault<T>(promise: Promise<T>, fallback: T): Promise<T> {
    try {
      return await promise;
    } catch {
      return fallback;
    }
  }

  private createDonutChart(config: {
    title: string;
    subtitle: string;
    items: PolymarketPosition[];
    valueAccessor: (position: PolymarketPosition) => number;
    labelAccessor: (position: PolymarketPosition) => string;
    formatter: (value: number) => string;
  }): DonutChart {
    const colors = ['#005cbb', '#0f766e', '#7c3aed', '#ea580c', '#475569', '#0891b2'];
    const grouped = new Map<string, number>();

    config.items.forEach((item) => {
      const value = config.valueAccessor(item);

      if (value <= 0) {
        return;
      }

      const label = config.labelAccessor(item);
      grouped.set(label, (grouped.get(label) ?? 0) + value);
    });

    const values = [...grouped.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    const visibleValues = values.slice(0, 5);
    const otherTotal = values.slice(5).reduce((total, item) => total + item.value, 0);

    if (otherTotal > 0) {
      visibleValues.push({ label: 'Other', value: otherTotal });
    }

    const total = visibleValues.reduce((sum, item) => sum + item.value, 0);
    let startAngle = -90;

    return {
      title: config.title,
      subtitle: config.subtitle,
      total,
      formattedTotal: config.formatter(total),
      segments: visibleValues.map((item, index) => {
        const percent = total > 0 ? (item.value / total) * 100 : 0;
        const endAngle = startAngle + (percent / 100) * 360;
        const segment = {
          label: item.label,
          value: item.value,
          formattedValue: config.formatter(item.value),
          percent,
          path: this.describeDonutSegment(21, 21, 15.8, 10.9, startAngle, endAngle),
          color: colors[index % colors.length],
          isNegative: false,
        };

        startAngle = endAngle;
        return segment;
      }),
    };
  }

  private createPnlDonutChart(config: {
    title: string;
    subtitle: string;
    items: PolymarketPosition[];
    labelAccessor: (position: PolymarketPosition) => string;
  }): DonutChart {
    const profitColors = ['#07855f', '#0f766e', '#0891b2'];
    const lossColors = ['#c2410c', '#dc2626', '#b45309'];
    const values = config.items
      .map((position) => ({
        label: config.labelAccessor(position),
        signedValue: this.numberOrZero(position.realizedPnl),
      }))
      .filter((item) => item.signedValue !== 0)
      .sort((a, b) => Math.abs(b.signedValue) - Math.abs(a.signedValue));
    const visibleValues = values.slice(0, 5);
    const otherSignedTotal = values.slice(5).reduce((total, item) => total + item.signedValue, 0);

    if (otherSignedTotal !== 0) {
      visibleValues.push({ label: 'Other', signedValue: otherSignedTotal });
    }

    const absoluteTotal = visibleValues.reduce((sum, item) => sum + Math.abs(item.signedValue), 0);
    const netTotal = visibleValues.reduce((sum, item) => sum + item.signedValue, 0);
    let startAngle = -90;
    let profitIndex = 0;
    let lossIndex = 0;

    return {
      title: config.title,
      subtitle: config.subtitle,
      total: netTotal,
      formattedTotal: this.formatCurrency(netTotal),
      segments: visibleValues.map((item) => {
        const isNegative = item.signedValue < 0;
        const percent = absoluteTotal > 0 ? (Math.abs(item.signedValue) / absoluteTotal) * 100 : 0;
        const endAngle = startAngle + (percent / 100) * 360;
        const color = isNegative
          ? lossColors[lossIndex++ % lossColors.length]
          : profitColors[profitIndex++ % profitColors.length];
        const segment = {
          label: item.label,
          value: Math.abs(item.signedValue),
          formattedValue: this.formatCurrency(item.signedValue),
          percent,
          path: this.describeDonutSegment(21, 21, 15.8, 10.9, startAngle, endAngle),
          color,
          isNegative,
        };

        startAngle = endAngle;
        return segment;
      }),
    };
  }

  private describeDonutSegment(
    centerX: number,
    centerY: number,
    outerRadius: number,
    innerRadius: number,
    startAngle: number,
    endAngle: number,
  ): string {
    const startOuter = this.polarToCartesian(centerX, centerY, outerRadius, startAngle);
    const endOuter = this.polarToCartesian(centerX, centerY, outerRadius, endAngle);
    const startInner = this.polarToCartesian(centerX, centerY, innerRadius, endAngle);
    const endInner = this.polarToCartesian(centerX, centerY, innerRadius, startAngle);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
      `L ${startInner.x} ${startInner.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y}`,
      'Z',
    ].join(' ');
  }

  private polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number): { x: string; y: string } {
    const angleInRadians = (angleInDegrees * Math.PI) / 180;

    return {
      x: (centerX + radius * Math.cos(angleInRadians)).toFixed(3),
      y: (centerY + radius * Math.sin(angleInRadians)).toFixed(3),
    };
  }
}
