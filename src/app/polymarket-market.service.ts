import { Injectable } from '@angular/core';

export type GammaMarket = {
  id: string;
  question: string;
  slug?: string;
  outcomes: string;
  outcomePrices: string;
  volume?: string;
  volumeNum?: number;
  volume24hr?: number;
  liquidity?: string;
  liquidityNum?: number;
  active: boolean;
  closed: boolean;
  tags?: Array<{ label?: string; slug?: string }>;
  events?: Array<{
    title?: string;
    category?: string;
    tags?: Array<{ label?: string; slug?: string }>;
  }>;
};

@Injectable({ providedIn: 'root' })
export class PolymarketMarketService {
  private readonly gammaApi = 'https://gamma-api.polymarket.com';

  getTopMarkets(): Promise<GammaMarket[]> {
    return this.getJson<GammaMarket[]>(`${this.gammaApi}/markets`, {
      active: 'true',
      closed: 'false',
      limit: '40',
      order: 'volume24hr',
      ascending: 'false',
    });
  }

  private async getJson<T>(url: string, params: Record<string, string>): Promise<T> {
    const endpoint = new URL(url);

    Object.entries(params).forEach(([key, value]) => {
      endpoint.searchParams.set(key, value);
    });

    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(`Polymarket Gamma API returned ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
