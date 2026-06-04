import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';

export type SavedTrade = {
  id: string;
  url: string;
  title: string;
  createdAt: string;
};

type SavedTradeRow = {
  id: string;
  url: string;
  title: string;
  created_at: string;
};

@Injectable({ providedIn: 'root' })
export class SavedTradesService {
  private readonly supabase = inject(SupabaseClientService);

  async list(): Promise<SavedTrade[]> {
    const { data, error } = await this.supabase
      .get()
      .from('saved_trades')
      .select('id, url, title, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data as SavedTradeRow[]).map(mapSavedTrade);
  }

  async create(url: string, title: string): Promise<SavedTrade> {
    const { data, error } = await this.supabase
      .get()
      .from('saved_trades')
      .insert({ url, title })
      .select('id, url, title, created_at')
      .single();

    if (error) {
      throw error;
    }

    return mapSavedTrade(data as SavedTradeRow);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.get().from('saved_trades').delete().eq('id', id);

    if (error) {
      throw error;
    }
  }
}

function mapSavedTrade(row: SavedTradeRow): SavedTrade {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    createdAt: row.created_at,
  };
}
