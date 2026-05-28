import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

export type ProfileErrorKey =
  | 'profileAuthErrorEmailMismatch'
  | 'profileAuthErrorPasswordMatch'
  | 'profileAuthErrorRequired';

export type ProfileUser = {
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
  errorKey: ProfileErrorKey | null;
};

type ProfileStorageValue = {
  user: ProfileUser;
  authenticated: boolean;
};

const storageKey = 'poly-roly-profile';

const initialState: ProfileState = {
  user: null,
  loginEmail: '',
  loginPassword: '',
  registerUsername: '',
  registerEmail: '',
  registerPassword: '',
  registerConfirmPassword: '',
  errorKey: null,
};

export const ProfileStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ user }) => ({
    isAuthenticated: computed(() => user() !== null),
    initials: computed(() => createInitials(user())),
  })),
  withMethods((store) => ({
    hydrate(): void {
      const savedProfile = readSavedProfile();

      if (savedProfile?.authenticated) {
        patchState(store, {
          user: savedProfile.user,
          loginEmail: savedProfile.user.email,
          errorKey: null,
        });
      }
    },

    setLoginEmail(loginEmail: string): void {
      patchState(store, { loginEmail, errorKey: null });
    },

    setLoginPassword(loginPassword: string): void {
      patchState(store, { loginPassword, errorKey: null });
    },

    setRegisterUsername(registerUsername: string): void {
      patchState(store, { registerUsername, errorKey: null });
    },

    setRegisterEmail(registerEmail: string): void {
      patchState(store, { registerEmail, errorKey: null });
    },

    setRegisterPassword(registerPassword: string): void {
      patchState(store, { registerPassword, errorKey: null });
    },

    setRegisterConfirmPassword(registerConfirmPassword: string): void {
      patchState(store, { registerConfirmPassword, errorKey: null });
    },

    register(): void {
      const username = store.registerUsername().trim();
      const email = store.registerEmail().trim();
      const password = store.registerPassword();
      const confirmPassword = store.registerConfirmPassword();

      if (!username || !isEmail(email) || !password || !confirmPassword) {
        patchState(store, { errorKey: 'profileAuthErrorRequired' });
        return;
      }

      if (password !== confirmPassword) {
        patchState(store, { errorKey: 'profileAuthErrorPasswordMatch' });
        return;
      }

      const now = new Date().toISOString();
      const user: ProfileUser = {
        username,
        email,
        createdAt: now,
        lastLoginAt: now,
      };

      saveProfile(user, true);
      patchState(store, {
        user,
        loginEmail: email,
        loginPassword: '',
        registerPassword: '',
        registerConfirmPassword: '',
        errorKey: null,
      });
    },

    login(): void {
      const email = store.loginEmail().trim();
      const password = store.loginPassword();
      const savedUser = readSavedProfile()?.user;

      if (!isEmail(email) || !password) {
        patchState(store, { errorKey: 'profileAuthErrorRequired' });
        return;
      }

      if (!savedUser || savedUser.email.toLowerCase() !== email.toLowerCase()) {
        patchState(store, { errorKey: 'profileAuthErrorEmailMismatch' });
        return;
      }

      const user = {
        ...savedUser,
        lastLoginAt: new Date().toISOString(),
      };

      saveProfile(user, true);
      patchState(store, {
        user,
        loginPassword: '',
        errorKey: null,
      });
    },

    logout(): void {
      const user = store.user();

      if (user) {
        saveProfile(user, false);
      }

      patchState(store, {
        user: null,
        loginPassword: '',
        errorKey: null,
      });
    },
  })),
);

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

function readSavedProfile(): ProfileStorageValue | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  try {
    const rawProfile = storage.getItem(storageKey);

    if (!rawProfile) {
      return null;
    }

    const parsedProfile = JSON.parse(rawProfile) as ProfileStorageValue | ProfileUser;

    if ('user' in parsedProfile) {
      return parsedProfile;
    }

    return {
      user: parsedProfile,
      authenticated: true,
    };
  } catch {
    return null;
  }
}

function saveProfile(user: ProfileUser, authenticated: boolean): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(storageKey, JSON.stringify({ user, authenticated }));
}

function getStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
