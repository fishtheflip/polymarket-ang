import { Injectable } from '@angular/core';

export type PolymarketProfile = {
  name: string | null;
  pseudonym: string | null;
  proxyWallet: string | null;
  profileImage: string | null;
  xUsername: string | null;
  verifiedBadge: boolean | null;
};

export type PolymarketPosition = {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  title: string;
  slug: string;
  eventSlug: string;
  outcome: string;
  oppositeOutcome: string;
  currentValue: number;
  initialValue: number;
  cashPnl: number;
  percentPnl: number;
  realizedPnl: number;
  percentRealizedPnl: number;
  totalBought: number;
  curPrice: number;
  avgPrice: number;
  size: number;
  endDate: string;
  redeemable: boolean;
  mergeable: boolean;
  negativeRisk: boolean;
};

export type PolymarketActivity = {
  proxyWallet: string;
  timestamp: number;
  title?: string;
  slug?: string;
  type?: string;
  side?: string;
  outcome?: string;
  price?: number;
  size?: number;
  usdcSize?: number;
  transactionHash?: string;
};

export type PolymarketTrade = {
  proxyWallet?: string;
  timestamp?: number;
  title?: string;
  slug?: string;
  eventSlug?: string;
  side?: string;
  outcome?: string;
  price?: number;
  size?: number;
  usdcSize?: number;
  name?: string;
  pseudonym?: string;
  profileImage?: string;
  transactionHash?: string;
};

type PolymarketValueResponse =
  | number
  | Array<{ user?: string; value?: number }>
  | {
      value?: number;
      totalValue?: number;
      currentValue?: number;
    };

@Injectable({ providedIn: 'root' })
export class PolymarketAccountService {
  private readonly dataApi = 'https://data-api.polymarket.com';
  private readonly gammaApi = 'https://gamma-api.polymarket.com';

  getProfile(address: string): Promise<PolymarketProfile> {
    return this.getJson<PolymarketProfile>(`${this.gammaApi}/public-profile`, { address });
  }

  getPositions(address: string): Promise<PolymarketPosition[]> {
    return this.getJson<PolymarketPosition[]>(`${this.dataApi}/positions`, {
      user: address,
      limit: '100',
      sortBy: 'CURRENT',
      sortDirection: 'DESC',
    });
  }

  getClosedPositions(address: string): Promise<PolymarketPosition[]> {
    return this.getJson<PolymarketPosition[]>(`${this.dataApi}/closed-positions`, {
      user: address,
      limit: '100',
      sortBy: 'TIMESTAMP',
      sortDirection: 'DESC',
    });
  }

  getActivity(address: string): Promise<PolymarketActivity[]> {
    return this.getJson<PolymarketActivity[]>(`${this.dataApi}/activity`, {
      user: address,
      limit: '25',
      offset: '0',
    });
  }

  getTrades(address: string): Promise<PolymarketTrade[]> {
    return this.getJson<PolymarketTrade[]>(`${this.dataApi}/trades`, {
      user: address,
      limit: '25',
      offset: '0',
    });
  }

  async getRecentTrades(limit = 200): Promise<PolymarketTrade[]> {
    const pageSize = 500;
    const boundedLimit = Math.min(limit, 3500);
    const pages = Math.ceil(boundedLimit / pageSize);
    const responses: PolymarketTrade[][] = [];

    for (let index = 0; index < pages; index += 1) {
      const page = await this.getJsonOrNull<PolymarketTrade[]>(`${this.dataApi}/trades`, {
        limit: String(pageSize),
        offset: String(index * pageSize),
      });

      if (!page?.length) {
        break;
      }

      responses.push(page);
    }

    return this.dedupeTrades(responses.flat()).slice(0, boundedLimit);
  }

  async getTradedMarketsCount(address: string): Promise<number | null> {
    const response = await this.getJson<{ traded?: number }>(`${this.dataApi}/traded`, {
      user: address,
    });

    return response.traded ?? null;
  }

  async getPositionValue(address: string): Promise<number | null> {
    const response = await this.getJson<PolymarketValueResponse>(`${this.dataApi}/value`, {
      user: address,
    });

    if (typeof response === 'number') {
      return response;
    }

    if (Array.isArray(response)) {
      return response[0]?.value ?? null;
    }

    return response.value ?? response.totalValue ?? response.currentValue ?? null;
  }

  private async getJson<T>(url: string, params: Record<string, string>): Promise<T> {
    const endpoint = this.buildEndpoint(url, params);
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(`Polymarket API returned ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private async getJsonOrNull<T>(url: string, params: Record<string, string>): Promise<T | null> {
    const endpoint = this.buildEndpoint(url, params);
    const response = await fetch(endpoint);

    if (!response.ok) {
      if (response.status === 400 || response.status === 404) {
        return null;
      }

      throw new Error(`Polymarket API returned ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private buildEndpoint(url: string, params: Record<string, string>): URL {
    const endpoint = new URL(url);

    Object.entries(params).forEach(([key, value]) => {
      endpoint.searchParams.set(key, value);
    });

    return endpoint;
  }

  private dedupeTrades(trades: PolymarketTrade[]): PolymarketTrade[] {
    const seen = new Set<string>();

    return trades.filter((trade) => {
      const key = [
        trade.transactionHash,
        trade.proxyWallet,
        trade.timestamp,
        trade.slug,
        trade.outcome,
        trade.side,
        trade.price,
        trade.size,
      ].join('|');

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }
}
