import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { PolymarketAccountService, PolymarketTrade } from './polymarket-account.service';
import { PolymarketMarketService } from './polymarket-market.service';

const whaleTrades: PolymarketTrade[] = [
  {
    proxyWallet: '0x1111111111111111111111111111111111111111',
    timestamp: 100,
    title: 'Whale BUY market',
    slug: 'whale-buy-market',
    side: 'BUY',
    outcome: 'Yes',
    price: 0.5,
    size: 2000,
    usdcSize: 1000,
    name: 'Buyer',
  },
  {
    proxyWallet: '0x2222222222222222222222222222222222222222',
    timestamp: 101,
    title: 'Whale SELL market',
    slug: 'whale-sell-market',
    side: 'SELL',
    outcome: 'No',
    price: 0.8,
    size: 1500,
    usdcSize: 1200,
    name: 'Seller',
  },
  {
    proxyWallet: '0x3333333333333333333333333333333333333333',
    timestamp: 102,
    title: 'Risky market',
    slug: 'risky-market',
    side: 'BUY',
    outcome: 'Yes',
    price: 0.2,
    size: 4000,
    usdcSize: 800,
    name: 'Risky',
  },
];

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: PolymarketAccountService,
          useValue: {
            getRecentTrades: () => Promise.resolve(whaleTrades),
          },
        },
        {
          provide: PolymarketMarketService,
          useValue: {
            getTopMarkets: () => Promise.resolve([]),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render dashboard heading', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Poly Roly');
  });

  it('smoke: renders the main navigation tabs', async () => {
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const tabText = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]')).map((tab) =>
      tab.textContent?.trim(),
    );

    expect(tabText).toEqual(['Аккаунт', 'Обзор рынков', 'Киты', 'Market Watcher', 'Профиль']);
  });

  it('e2e-like: filters large whale trades by BUY and SELL', async () => {
    const fixture = TestBed.createComponent(App);
    const nativeElement = fixture.nativeElement as HTMLElement;

    (fixture.componentInstance as unknown as { selectedTabIndex: { set: (value: number) => void } }).selectedTabIndex.set(2);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain('Топ-10 крупных сделок');
    expect(visibleWhaleRows(nativeElement)).toHaveLength(3);

    await clickAndStabilize(fixture, buttonByLabel(nativeElement, 'Фильтр крупных сделок: BUY'));

    expect(visibleWhaleRows(nativeElement)).toHaveLength(2);
    expect(nativeElement.textContent).toContain('Whale BUY market');
    expect(nativeElement.textContent).toContain('Risky market');
    expect(nativeElement.textContent).not.toContain('Whale SELL market');

    await clickAndStabilize(fixture, buttonByLabel(nativeElement, 'Фильтр крупных сделок: SELL'));

    expect(visibleWhaleRows(nativeElement)).toHaveLength(1);
    expect(nativeElement.textContent).toContain('Whale SELL market');
    expect(nativeElement.textContent).not.toContain('Whale BUY market');
  });
});

function buttonByLabel(root: HTMLElement, label: string): HTMLElement {
  const button = root.querySelector<HTMLElement>(`button[aria-label="${label}"]`);

  if (!button) {
    throw new Error(`Could not find button: ${label}`);
  }

  return button;
}

async function clickAndStabilize(fixture: ReturnType<typeof TestBed.createComponent<App>>, element: HTMLElement): Promise<void> {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function visibleWhaleRows(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('.whale-move')).filter((row) => row.textContent?.trim());
}
