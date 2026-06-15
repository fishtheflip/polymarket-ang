import { Injectable, inject } from '@angular/core';
import { PolymarketProfile } from './polymarket-account.service';
import { SupabaseClientService } from './supabase-client.service';

export type SavedTrader = {
  id: string;
  address: string;
  name: string | null;
  pseudonym: string | null;
  profileImage: string | null;
  createdAt: string;
};

type SavedTraderRow = {
  id: string;
  address: string;
  name: string | null;
  pseudonym: string | null;
  profile_image: string | null;
  created_at: string;
};

@Injectable({ providedIn: 'root' })
export class SavedTradersService {
  private readonly supabase = inject(SupabaseClientService);

  async list(): Promise<SavedTrader[]> {
    const { data, error } = await this.supabase
      .get()
      .from('saved_traders')
      .select('id, address, name, pseudonym, profile_image, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data as SavedTraderRow[]).map(mapSavedTrader);
  }

  async create(address: string, profile: PolymarketProfile): Promise<SavedTrader> {
    const { data, error } = await this.supabase
      .get()
      .from('saved_traders')
      .insert({
        address,
        name: profile.name,
        pseudonym: profile.pseudonym,
        profile_image: profile.profileImage,
      })
      .select('id, address, name, pseudonym, profile_image, created_at')
      .single();

    if (error) {
      throw error;
    }

    return mapSavedTrader(data as SavedTraderRow);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.get().from('saved_traders').delete().eq('id', id);

    if (error) {
      throw error;
    }
  }
}

function mapSavedTrader(row: SavedTraderRow): SavedTrader {
  return {
    id: row.id,
    address: row.address,
    name: row.name,
    pseudonym: row.pseudonym,
    profileImage: row.profile_image,
    createdAt: row.created_at,
  };
}
