import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-root',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatListModule,
    MatProgressBarModule,
    MatSidenavModule,
    MatToolbarModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly stats = [
    { label: 'Portfolio value', value: '$42,186', delta: '+8.4%', icon: 'account_balance_wallet' },
    { label: 'Open positions', value: '18', delta: '+3 today', icon: 'stacked_line_chart' },
    { label: '24h volume', value: '$1.28M', delta: '+12.1%', icon: 'query_stats' },
    { label: 'Watchlist edge', value: '6.7%', delta: 'avg spread', icon: 'notifications_active' },
  ];

  protected readonly navItems = [
    { label: 'Overview', icon: 'dashboard' },
    { label: 'Markets', icon: 'candlestick_chart' },
    { label: 'Portfolio', icon: 'pie_chart' },
    { label: 'Alerts', icon: 'add_alert' },
  ];

  protected readonly markets = [
    {
      title: 'Will the Fed cut rates in June?',
      category: 'Macro',
      probability: 62,
      volume: '$8.4M',
      change: '+4.2%',
      side: 'YES',
      liquidity: 84,
    },
    {
      title: 'Bitcoin above $100k by Friday?',
      category: 'Crypto',
      probability: 38,
      volume: '$3.1M',
      change: '-2.8%',
      side: 'NO',
      liquidity: 61,
    },
    {
      title: 'Champions League final: Inter wins',
      category: 'Sports',
      probability: 47,
      volume: '$920K',
      change: '+1.6%',
      side: 'YES',
      liquidity: 48,
    },
    {
      title: 'US unemployment rate above 4.2%',
      category: 'Economics',
      probability: 55,
      volume: '$1.7M',
      change: '+0.9%',
      side: 'YES',
      liquidity: 72,
    },
  ];

  protected readonly activity = [
    { action: 'Bought YES', market: 'Fed cut rates in June', value: '$1,200', time: '2m ago' },
    { action: 'Sold NO', market: 'BTC above $100k', value: '$640', time: '18m ago' },
    { action: 'Added watch', market: 'US unemployment above 4.2%', value: 'Alert', time: '41m ago' },
  ];
}
