import { computed, inject } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { SupabaseAuthService } from '../supabase-auth.service';

export type ProfileErrorKey =
  | 'profileAuthErrorCredentials'
  | 'profileAuthErrorGeneric'
  | 'profileAuthErrorPasswordLength'
  | 'profileAuthErrorPasswordMatch'
  | 'profileAuthErrorRequired'
  | 'profileSupabaseNotConfigured';

export type ProfileMessageKey = 'profileCheckEmail';

export type ProfileUser = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  lastLoginAt: string;
};

type ProfileState = {
  user: ProfileUser | null;
  loginEmail: string;
  loginPassword: string;
  registerUsername: string;
  registerEmail: string;
  registerPassword: string;
  registerConfirmPassword: string;
  loading: boolean;
  backendConfigured: boolean;
  errorKey: ProfileErrorKey | null;
  messageKey: ProfileMessageKey | null;
};

const initialState: ProfileState = {
  user: null,
  loginEmail: '',
  loginPassword: '',
  registerUsername: '',
  registerEmail: '',
  registerPassword: '',
  registerConfirmPassword: '',
  loading: false,
  backendConfigured: false,
  errorKey: null,
  messageKey: null,
};

export const ProfileStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ user }) => ({
    isAuthenticated: computed(() => user() !== null),
    initials: computed(() => createInitials(user())),
  })),
  withMethods((store, auth = inject(SupabaseAuthService)) => ({
    async hydrate(): Promise<void> {
      patchState(store, { backendConfigured: auth.isConfigured });

      if (!auth.isConfigured) {
        return;
      }

      try {
        const session = await auth.getSession();
        patchState(store, { user: session?.user ? mapUser(session.user) : null });
      } catch {
        patchState(store, { errorKey: 'profileAuthErrorGeneric' });
      }

      auth.onAuthStateChange((_event, user) => {
        patchState(store, { user: user ? mapUser(user) : null });
      });
    },

    setLoginEmail(loginEmail: string): void {
      patchState(store, { loginEmail, errorKey: null, messageKey: null });
    },

    setLoginPassword(loginPassword: string): void {
      patchState(store, { loginPassword, errorKey: null, messageKey: null });
    },

    setRegisterUsername(registerUsername: string): void {
      patchState(store, { registerUsername, errorKey: null, messageKey: null });
    },

    setRegisterEmail(registerEmail: string): void {
      patchState(store, { registerEmail, errorKey: null, messageKey: null });
    },

    setRegisterPassword(registerPassword: string): void {
      patchState(store, { registerPassword, errorKey: null, messageKey: null });
    },

    setRegisterConfirmPassword(registerConfirmPassword: string): void {
      patchState(store, { registerConfirmPassword, errorKey: null, messageKey: null });
    },

    async register(): Promise<void> {
      const username = store.registerUsername().trim();
      const email = store.registerEmail().trim();
      const password = store.registerPassword();
      const confirmPassword = store.registerConfirmPassword();

      if (!auth.isConfigured) {
        patchState(store, { errorKey: 'profileSupabaseNotConfigured' });
        return;
      }

      if (!username || !isEmail(email) || !password || !confirmPassword) {
        patchState(store, { errorKey: 'profileAuthErrorRequired' });
        return;
      }

      if (password.length < 6) {
        patchState(store, { errorKey: 'profileAuthErrorPasswordLength' });
        return;
      }

      if (password !== confirmPassword) {
        patchState(store, { errorKey: 'profileAuthErrorPasswordMatch' });
        return;
      }

      patchState(store, { loading: true, errorKey: null, messageKey: null });

      try {
        const user = await auth.signUp(email, password, username);
        patchState(store, {
          user: user ? mapUser(user) : null,
          loginEmail: email,
          loginPassword: '',
          registerPassword: '',
          registerConfirmPassword: '',
          messageKey: user ? null : 'profileCheckEmail',
        });
      } catch {
        patchState(store, { errorKey: 'profileAuthErrorGeneric' });
      } finally {
        patchState(store, { loading: false });
      }
    },

    async login(): Promise<void> {
      const email = store.loginEmail().trim();
      const password = store.loginPassword();

      if (!auth.isConfigured) {
        patchState(store, { errorKey: 'profileSupabaseNotConfigured' });
        return;
      }

      if (!isEmail(email) || !password) {
        patchState(store, { errorKey: 'profileAuthErrorRequired' });
        return;
      }

      patchState(store, { loading: true, errorKey: null, messageKey: null });

      try {
        const user = await auth.signIn(email, password);
        patchState(store, { user: mapUser(user), loginPassword: '' });
      } catch {
        patchState(store, { errorKey: 'profileAuthErrorCredentials' });
      } finally {
        patchState(store, { loading: false });
      }
    },

    async logout(): Promise<void> {
      if (!auth.isConfigured) {
        return;
      }

      patchState(store, { loading: true, errorKey: null, messageKey: null });

      try {
        await auth.signOut();
        patchState(store, { user: null, loginPassword: '' });
      } catch {
        patchState(store, { errorKey: 'profileAuthErrorGeneric' });
      } finally {
        patchState(store, { loading: false });
      }
    },
  })),
);

function mapUser(user: User): ProfileUser {
  return {
    id: user.id,
    username: String(user.user_metadata?.['username'] || user.email?.split('@')[0] || 'User'),
    email: user.email ?? '',
    createdAt: user.created_at,
    lastLoginAt: user.last_sign_in_at ?? user.created_at,
  };
}

function createInitials(user: ProfileUser | null): string {
  if (!user) {
    return 'PR';
  }

  const source = user.username || user.email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'PR';
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
