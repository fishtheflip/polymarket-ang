import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import {
  PolymarketActivity,
  PolymarketPosition,
  PolymarketTrade,
} from './polymarket-account.service';
import { I18nService, Language } from './i18n.service';
import { AccountStore } from './state/account.store';
import { MarketStore } from './state/market.store';
import { ProfileStore } from './state/profile.store';
import { SavedTradesStore } from './state/saved-trades.store';
import { WhaleStore } from './state/whale.store';

type ThemeMode = 'light' | 'dark';

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

@Component({
  selector: 'app-root',
  imports: [ButtonModule, CardModule, InputTextModule, ProgressBarModule, TabsModule, TagModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly chartTooltip = signal<ChartTooltip | null>(null);
  protected readonly themeMode = signal<ThemeMode>('dark');
  protected readonly accountStore = inject(AccountStore);
  protected readonly marketStore = inject(MarketStore);
  protected readonly profileStore = inject(ProfileStore);
  protected readonly savedTradesStore = inject(SavedTradesStore);
  protected readonly whaleStore = inject(WhaleStore);
  protected readonly selectedTabIndex = signal(0);

  protected readonly isDarkTheme = computed(() => this.themeMode() === 'dark');
  protected readonly currentPositionsChart = computed(() =>
    this.createDonutChart({
      title: this.t('currentPositionsMix'),
      subtitle: this.t('allocationByCurrentValue'),
      items: this.accountStore.positions(),
      valueAccessor: (position) => this.numberOrZero(position.currentValue),
      labelAccessor: (position) => position.title || this.t('position'),
      formatter: (value) => this.formatCurrency(value),
    }),
  );
  protected readonly closedPositionsChart = computed(() =>
    this.createPnlDonutChart({
      title: this.t('closedPositionsPnl'),
      subtitle: this.t('realizedPnlByMarket'),
      items: this.accountStore.closedPositions(),
      labelAccessor: (position) => position.title || this.t('closedPositions'),
    }),
  );
  protected readonly selectedWhaleFeedTitle = computed(() =>
    this.whaleStore.mode() === 'risky' ? this.t('riskyWhaleFeed') : this.t('whaleFeed'),
  );
  protected readonly selectedWhaleFeedSubtitle = computed(() =>
    this.whaleStore.mode() === 'risky'
      ? this.t('riskyWhaleFeedSubtitle')
      : this.t('whaleFeedSubtitle'),
  );

  constructor(protected readonly i18n: I18nService) {}

  ngOnInit(): void {
    this.profileStore.hydrate();
    this.savedTradesStore.initialize();
    void this.marketStore.loadMarkets();
    void this.whaleStore.loadTrades();
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

  protected primeIcon(icon: string): string {
    const icons: Record<string, string> = {
      analytics: 'pi-chart-line',
      check: 'pi-check',
      content_copy: 'pi-copy',
      dark_mode: 'pi-moon',
      hourglass_top: 'pi-spin pi-spinner',
      light_mode: 'pi-sun',
      lock: 'pi-lock',
      logout: 'pi-sign-out',
      monitoring: 'pi-chart-line',
      notifications_active: 'pi-bell',
      person_add: 'pi-user-plus',
      query_stats: 'pi-chart-bar',
      refresh: 'pi-refresh',
      south_west: 'pi-arrow-down-left',
      stacked_line_chart: 'pi-chart-scatter',
      north_east: 'pi-arrow-up-right',
    };

    return icons[icon] ?? 'pi-circle';
  }

  protected async loadAccount(): Promise<void> {
    if (!this.accountStore.isValidAddress()) {
      this.accountStore.setError(this.t('useValidAddress'));
      return;
    }

    await this.accountStore.loadAccount();
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

  private numberOrZero(value: number | null | undefined): number {
    return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
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

  private polarToCartesian(
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number,
  ): { x: string; y: string } {
    const angleInRadians = (angleInDegrees * Math.PI) / 180;

    return {
      x: (centerX + radius * Math.cos(angleInRadians)).toFixed(3),
      y: (centerY + radius * Math.sin(angleInRadians)).toFixed(3),
    };
  }
}
