import { Injectable, inject } from '@angular/core';
import { PolymarketProfile } from './polymarket-account.service';
import { SupabaseClientService } from './supabase-client.service';

export type LinkedPolymarketProfile = {
  id: string;
  address: string;
  name: string | null;
  pseudonym: string | null;
  proxyWallet: string | null;
  profileImage: string | null;
  xUsername: string | null;
  verifiedBadge: boolean | null;
  createdAt: string;
};

type LinkedPolymarketProfileRow = {
  id: string;
  address: string;
  name: string | null;
  pseudonym: string | null;
  proxy_wallet: string | null;
  profile_image: string | null;
  x_username: string | null;
  verified_badge: boolean | null;
  created_at: string;
};

@Injectable({ providedIn: 'root' })
export class LinkedPolymarketProfilesService {
  private readonly supabase = inject(SupabaseClientService);

  async getCurrent(): Promise<LinkedPolymarketProfile | null> {
    const { data, error } = await this.supabase
      .get()
      .from('polymarket_profiles')
      .select(
        'id, address, name, pseudonym, proxy_wallet, profile_image, x_username, verified_badge, created_at',
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapLinkedPolymarketProfile(data as LinkedPolymarketProfileRow) : null;
  }

  async upsert(address: string, profile: PolymarketProfile): Promise<LinkedPolymarketProfile> {
    const { data, error } = await this.supabase
      .get()
      .from('polymarket_profiles')
      .upsert(
        {
          address,
          name: profile.name,
          pseudonym: profile.pseudonym,
          proxy_wallet: profile.proxyWallet,
          profile_image: profile.profileImage,
          x_username: profile.xUsername,
          verified_badge: profile.verifiedBadge,
        },
        { onConflict: 'user_id' },
      )
      .select(
        'id, address, name, pseudonym, proxy_wallet, profile_image, x_username, verified_badge, created_at',
      )
      .single();

    if (error) {
      throw error;
    }

    return mapLinkedPolymarketProfile(data as LinkedPolymarketProfileRow);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.get().from('polymarket_profiles').delete().eq('id', id);

    if (error) {
      throw error;
    }
  }
}

function mapLinkedPolymarketProfile(row: LinkedPolymarketProfileRow): LinkedPolymarketProfile {
  return {
    id: row.id,
    address: row.address,
    name: row.name,
    pseudonym: row.pseudonym,
    proxyWallet: row.proxy_wallet,
    profileImage: row.profile_image,
    xUsername: row.x_username,
    verifiedBadge: row.verified_badge,
    createdAt: row.created_at,
  };
}
