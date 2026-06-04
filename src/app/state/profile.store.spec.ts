import { TestBed } from '@angular/core/testing';
import { User } from '@supabase/supabase-js';
import { SupabaseAuthService } from '../supabase-auth.service';
import { ProfileStore } from './profile.store';

const supabaseUser = {
  id: 'user-1',
  email: 'andrei@example.com',
  created_at: '2026-06-04T00:00:00.000Z',
  last_sign_in_at: '2026-06-04T01:00:00.000Z',
  user_metadata: { username: 'Andrei' },
} as unknown as User;

describe('ProfileStore', () => {
  let auth: {
    isConfigured: boolean;
    getSession: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
    signUp: ReturnType<typeof vi.fn>;
    signIn: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    auth = {
      isConfigured: true,
      getSession: vi.fn().mockResolvedValue(null),
      onAuthStateChange: vi.fn(),
      signUp: vi.fn().mockResolvedValue(supabaseUser),
      signIn: vi.fn().mockResolvedValue(supabaseUser),
      signOut: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseAuthService, useValue: auth }],
    });
  });

  it('hydrates a Supabase session', async () => {
    auth.getSession.mockResolvedValue({ user: supabaseUser });
    const store = TestBed.inject(ProfileStore);

    await store.hydrate();

    expect(store.backendConfigured()).toBe(true);
    expect(store.user()).toEqual(
      expect.objectContaining({
        id: 'user-1',
        username: 'Andrei',
        email: 'andrei@example.com',
      }),
    );
    expect(store.initials()).toBe('A');
  });

  it('registers through Supabase Auth', async () => {
    const store = TestBed.inject(ProfileStore);

    store.setRegisterUsername('Andrei');
    store.setRegisterEmail('andrei@example.com');
    store.setRegisterPassword('secret');
    store.setRegisterConfirmPassword('secret');
    await store.register();

    expect(auth.signUp).toHaveBeenCalledWith('andrei@example.com', 'secret', 'Andrei');
    expect(store.isAuthenticated()).toBe(true);
    expect(store.errorKey()).toBeNull();
  });

  it('asks for email confirmation when sign-up creates no session', async () => {
    auth.signUp.mockResolvedValue(null);
    const store = TestBed.inject(ProfileStore);

    store.setRegisterUsername('Andrei');
    store.setRegisterEmail('andrei@example.com');
    store.setRegisterPassword('secret');
    store.setRegisterConfirmPassword('secret');
    await store.register();

    expect(store.user()).toBeNull();
    expect(store.messageKey()).toBe('profileCheckEmail');
  });

  it('shows a validation error when register passwords do not match', async () => {
    const store = TestBed.inject(ProfileStore);

    store.setRegisterUsername('Andrei');
    store.setRegisterEmail('andrei@example.com');
    store.setRegisterPassword('secret');
    store.setRegisterConfirmPassword('wrong');
    await store.register();

    expect(auth.signUp).not.toHaveBeenCalled();
    expect(store.errorKey()).toBe('profileAuthErrorPasswordMatch');
  });

  it('logs in and logs out through Supabase Auth', async () => {
    const store = TestBed.inject(ProfileStore);

    store.setLoginEmail('andrei@example.com');
    store.setLoginPassword('secret');
    await store.login();

    expect(auth.signIn).toHaveBeenCalledWith('andrei@example.com', 'secret');
    expect(store.isAuthenticated()).toBe(true);

    await store.logout();

    expect(auth.signOut).toHaveBeenCalled();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('does not submit auth forms until Supabase is configured', async () => {
    auth.isConfigured = false;
    const store = TestBed.inject(ProfileStore);

    store.setLoginEmail('andrei@example.com');
    store.setLoginPassword('secret');
    await store.login();

    expect(auth.signIn).not.toHaveBeenCalled();
    expect(store.errorKey()).toBe('profileSupabaseNotConfigured');
  });
});
