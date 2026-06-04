import { Injectable, inject } from '@angular/core';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { SupabaseClientService } from './supabase-client.service';

@Injectable({ providedIn: 'root' })
export class SupabaseAuthService {
  private readonly supabase = inject(SupabaseClientService);
  readonly isConfigured = this.supabase.isConfigured;

  async getSession(): Promise<Session | null> {
    const client = this.supabase.get();
    const { data, error } = await client.auth.getSession();

    if (error) {
      throw error;
    }

    return data.session;
  }

  onAuthStateChange(callback: (event: AuthChangeEvent, user: User | null) => void): void {
    if (this.isConfigured) {
      this.supabase.get().auth.onAuthStateChange((event, session) => callback(event, session?.user ?? null));
    }
  }

  async signUp(email: string, password: string, username: string): Promise<User | null> {
    const client = this.supabase.get();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) {
      throw error;
    }

    return data.session?.user ?? null;
  }

  async signIn(email: string, password: string): Promise<User> {
    const client = this.supabase.get();
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      throw error;
    }

    return data.user;
  }

  async signOut(): Promise<void> {
    const client = this.supabase.get();
    const { error } = await client.auth.signOut();

    if (error) {
      throw error;
    }
  }

}
