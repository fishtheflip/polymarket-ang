import { TestBed } from '@angular/core/testing';
import { ProfileStore } from './profile.store';

describe('ProfileStore', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('registers a local profile and stores it as authenticated', () => {
    const store = TestBed.inject(ProfileStore);

    store.setRegisterUsername('Andrei');
    store.setRegisterEmail('andrei@example.com');
    store.setRegisterPassword('secret');
    store.setRegisterConfirmPassword('secret');
    store.register();

    expect(store.isAuthenticated()).toBe(true);
    expect(store.user()).toEqual(
      expect.objectContaining({
        username: 'Andrei',
        email: 'andrei@example.com',
      }),
    );
    expect(store.initials()).toBe('A');
    expect(JSON.parse(localStorage.getItem('poly-roly-profile') || '{}')).toEqual(
      expect.objectContaining({
        authenticated: true,
      }),
    );
  });

  it('shows a validation error when register passwords do not match', () => {
    const store = TestBed.inject(ProfileStore);

    store.setRegisterUsername('Andrei');
    store.setRegisterEmail('andrei@example.com');
    store.setRegisterPassword('secret');
    store.setRegisterConfirmPassword('wrong');
    store.register();

    expect(store.user()).toBeNull();
    expect(store.errorKey()).toBe('profileAuthErrorPasswordMatch');
  });

  it('logs out without deleting the local profile and allows login again', () => {
    const store = TestBed.inject(ProfileStore);

    store.setRegisterUsername('Andrei');
    store.setRegisterEmail('andrei@example.com');
    store.setRegisterPassword('secret');
    store.setRegisterConfirmPassword('secret');
    store.register();
    store.logout();

    expect(store.isAuthenticated()).toBe(false);
    expect(JSON.parse(localStorage.getItem('poly-roly-profile') || '{}')).toEqual(
      expect.objectContaining({
        authenticated: false,
      }),
    );

    store.setLoginEmail('andrei@example.com');
    store.setLoginPassword('secret');
    store.login();

    expect(store.isAuthenticated()).toBe(true);
    expect(store.errorKey()).toBeNull();
  });

  it('hydrates only an authenticated local profile', () => {
    const savedUser = {
      username: 'Demo User',
      email: 'demo@example.com',
      createdAt: '2026-05-27T00:00:00.000Z',
      lastLoginAt: '2026-05-27T00:00:00.000Z',
    };

    localStorage.setItem(
      'poly-roly-profile',
      JSON.stringify({
        user: savedUser,
        authenticated: false,
      }),
    );

    const store = TestBed.inject(ProfileStore);
    store.hydrate();

    expect(store.user()).toBeNull();

    localStorage.setItem(
      'poly-roly-profile',
      JSON.stringify({
        user: savedUser,
        authenticated: true,
      }),
    );
    store.hydrate();

    expect(store.user()).toEqual(savedUser);
  });
});
