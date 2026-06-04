import { Injectable } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './supabase.config';

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  readonly isConfigured = Boolean(supabaseConfig.url && supabaseConfig.publishableKey);

  private readonly client = this.isConfigured
    ? createClient(supabaseConfig.url, supabaseConfig.publishableKey)
    : null;

  get(): SupabaseClient {
    if (!this.client) {
      throw new Error('SUPABASE_NOT_CONFIGURED');
    }

    return this.client;
  }
}
