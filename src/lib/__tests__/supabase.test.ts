import { AppState, Platform } from 'react-native';
import { createSupabaseClient } from '../supabase';

jest.mock('react-native', () => {
  const reactNative = jest.requireActual<typeof import('react-native')>('react-native');
  const appState = Object.create(reactNative.AppState) as typeof reactNative.AppState;
  appState.addEventListener = jest.fn();
  const platform = Object.create(reactNative.Platform) as typeof reactNative.Platform;
  Object.defineProperty(platform, 'OS', {
    configurable: true,
    enumerable: true,
    value: reactNative.Platform.OS,
    writable: true,
  });
  return Object.create(reactNative, {
    AppState: { configurable: true, value: appState },
    Platform: { configurable: true, value: platform },
  });
});

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('createSupabaseClient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('returns null when either configuration value is missing', () => {
    expect(createSupabaseClient(undefined, 'key')).toBeNull();
    expect(createSupabaseClient('https://example.supabase.co', undefined)).toBeNull();
  });

  it('creates a persistent client and starts or stops refresh with native app state', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const addEventListener = jest.spyOn(AppState, 'addEventListener');
    const client = createSupabaseClient('https://example.supabase.co', 'key');
    expect(client).not.toBeNull();
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    const listener = addEventListener.mock.calls[0][1];
    const start = jest
      .spyOn(client!.auth, 'startAutoRefresh')
      .mockImplementation(() => Promise.resolve());
    const stop = jest
      .spyOn(client!.auth, 'stopAutoRefresh')
      .mockImplementation(() => Promise.resolve());
    listener('active');
    listener('background');
    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('does not register native app-state listeners on web', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const addEventListener = jest.spyOn(AppState, 'addEventListener');
    expect(createSupabaseClient('https://example.supabase.co', 'key')).not.toBeNull();
    expect(addEventListener).not.toHaveBeenCalled();
  });

  it('does not need window when created by web static rendering', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const hadWindow = 'window' in globalThis;
    const existingWindow = globalThis.window;
    Reflect.deleteProperty(globalThis, 'window');
    try {
      expect(() => createSupabaseClient('https://example.supabase.co', 'key')).not.toThrow();
    } finally {
      if (hadWindow) {
        Object.defineProperty(globalThis, 'window', {
          configurable: true,
          value: existingWindow,
          writable: true,
        });
      }
    }
  });

  it('throws a clear error when the app-level client is not configured', async () => {
    const previousUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const previousKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    try {
      jest.resetModules();
      const unconfigured = jest.requireActual<typeof import('../supabase')>('../supabase');
      expect(unconfigured.requireSupabase).toThrow('Supabase is not configured');
    } finally {
      if (previousUrl === undefined) {
        delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      } else {
        process.env.EXPO_PUBLIC_SUPABASE_URL = previousUrl;
      }
      if (previousKey === undefined) {
        delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      } else {
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = previousKey;
      }
      jest.resetModules();
    }
  });

  it('returns the configured app-level client', async () => {
    const previousUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const previousKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'key';
    try {
      jest.resetModules();
      const configured = jest.requireActual<typeof import('../supabase')>('../supabase');
      expect(configured.requireSupabase()).toBe(configured.supabase);
    } finally {
      if (previousUrl === undefined) {
        delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      } else {
        process.env.EXPO_PUBLIC_SUPABASE_URL = previousUrl;
      }
      if (previousKey === undefined) {
        delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      } else {
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = previousKey;
      }
      jest.resetModules();
    }
  });
});
