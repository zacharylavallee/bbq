import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { SessionProvider, useSession } from '../SessionProvider';

jest.mock('../../lib/supabase', () => ({
  supabase: null,
}));

function makeSession(id: string, email = `${id}@bbq.local`): Session {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 1_800_000_000,
    user: {
      id,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-10-05T00:00:00Z',
      email,
    },
  } as Session;
}

function makeClient({
  session = null,
  profile = null,
  signInError = null,
  signOutError = null,
  sessionError = null,
  profileError = null,
  sessionRejection = false,
}: {
  session?: Session | null;
  profile?: { id: string; name: string | null; phone: string | null; role: string } | null;
  signInError?: { message: string } | null;
  signOutError?: { message: string } | null;
  sessionError?: { message: string } | null;
  profileError?: { message: string } | null;
  sessionRejection?: boolean;
} = {}) {
  let authListener: ((_event: string, nextSession: Session | null) => void) | undefined;
  const subscription = { unsubscribe: jest.fn() };
  const profileQuery = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue({ data: profile, error: profileError }),
  };
  profileQuery.select.mockReturnValue(profileQuery);
  profileQuery.eq.mockReturnValue(profileQuery);
  const client = {
    auth: {
      getSession: jest
        .fn()
        .mockImplementation(() =>
          sessionRejection
            ? Promise.reject(new Error('session request failed'))
            : Promise.resolve({ data: { session }, error: sessionError }),
        ),
      onAuthStateChange: jest.fn((callback: typeof authListener) => {
        authListener = callback;
        return { data: { subscription } };
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: signInError,
      }),
      signOut: jest.fn().mockResolvedValue({ error: signOutError }),
    },
    from: jest.fn(() => profileQuery),
  };
  return {
    client: client as unknown as SupabaseClient<Database>,
    authListener: (event: string, nextSession: Session | null) =>
      authListener?.(event, nextSession),
    profileQuery,
    subscription,
  };
}

describe('SessionProvider', () => {
  it('exposes the default session context without a provider', async () => {
    const { result } = await renderHook(() => useSession());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    await expect(result.current.signIn('admin@bbq.local', 'password')).resolves.toBe(
      "Sign-in isn't set up yet.",
    );
    await expect(result.current.signOut()).resolves.toBeUndefined();
  });

  it('settles immediately and reports an unset sign-in when no client is configured', async () => {
    const { result } = await renderHook(() => useSession(), {
      wrapper: ({ children }) => <SessionProvider client={null}>{children}</SessionProvider>,
    });
    expect(result.current.isLoading).toBe(false);
    await expect(result.current.signIn('admin@bbq.local', 'password')).resolves.toBe(
      "Sign-in isn't set up yet.",
    );
    await expect(result.current.signOut()).resolves.toBeUndefined();
  });

  it('loads the current session and profile in separate effects', async () => {
    const session = makeSession('admin-id');
    const profile = {
      id: session.user.id,
      name: 'Pitmaster',
      phone: null,
      role: 'admin',
    };
    const { client, profileQuery } = makeClient({ session, profile });
    const { result } = await renderHook(() => useSession(), {
      wrapper: ({ children }) => <SessionProvider client={client}>{children}</SessionProvider>,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session).toBe(session);
    expect(result.current.profile).toEqual(profile);
    expect(result.current.isAdmin).toBe(true);
    expect(profileQuery.eq).toHaveBeenCalledWith('id', 'admin-id');
  });

  it('normalizes non-admin profile roles to customer and clears profiles without a session', async () => {
    const session = makeSession('customer-id');
    const { client, authListener } = makeClient({
      session,
      profile: { id: session.user.id, name: null, phone: null, role: 'unexpected' },
    });
    const { result } = await renderHook(() => useSession(), {
      wrapper: ({ children }) => <SessionProvider client={client}>{children}</SessionProvider>,
    });
    await waitFor(() => expect(result.current.profile?.role).toBe('customer'));
    expect(result.current.isAdmin).toBe(false);
    await act(async () => authListener('SIGNED_OUT', null));
    await waitFor(() => expect(result.current.profile).toBeNull());
    expect(result.current.session).toBeNull();
  });

  it('settles a failed session lookup and ignores profile query errors', async () => {
    const failedSession = makeClient({
      session: makeSession('session-error'),
      sessionError: { message: 'session error' },
    });
    const first = await renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <SessionProvider client={failedSession.client}>{children}</SessionProvider>
      ),
    });
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    expect(first.result.current.session).toBeNull();

    const failedProfile = makeClient({
      session: makeSession('profile-error'),
      profileError: { message: 'profile error' },
    });
    const second = await renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <SessionProvider client={failedProfile.client}>{children}</SessionProvider>
      ),
    });
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));
    expect(second.result.current.profile).toBeNull();
  });

  it('settles a rejected session request and a missing profile', async () => {
    const rejected = makeClient({ sessionRejection: true });
    const first = await renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <SessionProvider client={rejected.client}>{children}</SessionProvider>
      ),
    });
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    expect(first.result.current.session).toBeNull();

    const noProfile = makeClient({ session: makeSession('profile-missing') });
    const second = await renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <SessionProvider client={noProfile.client}>{children}</SessionProvider>
      ),
    });
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));
    expect(second.result.current.profile).toBeNull();
  });

  it('fetches a profile when auth changes and unsubscribes on unmount', async () => {
    const { client, authListener, profileQuery, subscription } = makeClient();
    const { result, unmount } = await renderHook(() => useSession(), {
      wrapper: ({ children }) => <SessionProvider client={client}>{children}</SessionProvider>,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const session = makeSession('new-user');
    await act(async () => authListener('SIGNED_IN', session));
    await waitFor(() => expect(profileQuery.eq).toHaveBeenCalledWith('id', 'new-user'));
    await unmount();
    expect(subscription.unsubscribe).toHaveBeenCalled();
  });

  it('ignores completed auth and profile requests after unmount', async () => {
    const pendingSession = makeClient();
    let finishSession:
      ((value: { data: { session: Session | null }; error: null }) => void) | null = null;
    (pendingSession.client.auth.getSession as jest.Mock).mockReturnValue(
      new Promise<{ data: { session: Session | null }; error: null }>((resolve) => {
        finishSession = resolve;
      }),
    );
    const authHook = await renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <SessionProvider client={pendingSession.client}>{children}</SessionProvider>
      ),
    });
    await authHook.unmount();
    await act(async () => {
      finishSession?.({ data: { session: null }, error: null });
    });
    pendingSession.authListener('SIGNED_OUT', null);

    const pendingProfile = makeClient({ session: makeSession('slow-profile') });
    let finishProfile:
      | ((value: {
          data: { id: string; name: string | null; phone: string | null; role: string } | null;
          error: null;
        }) => void)
      | null = null;
    pendingProfile.profileQuery.maybeSingle.mockReturnValue(
      new Promise<{
        data: { id: string; name: string | null; phone: string | null; role: string } | null;
        error: null;
      }>((resolve) => {
        finishProfile = resolve;
      }),
    );
    const profileHook = await renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <SessionProvider client={pendingProfile.client}>{children}</SessionProvider>
      ),
    });
    await waitFor(() => expect(pendingProfile.profileQuery.maybeSingle).toHaveBeenCalled());
    await profileHook.unmount();
    await act(async () => {
      finishProfile?.({
        data: { id: 'slow-profile', name: null, phone: null, role: 'customer' },
        error: null,
      });
    });

    const rejectedSession = makeClient();
    let rejectSession!: (reason: unknown) => void;
    (rejectedSession.client.auth.getSession as jest.Mock).mockReturnValue(
      new Promise((_, reject) => {
        rejectSession = reject;
      }),
    );
    const rejectedAuthHook = await renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <SessionProvider client={rejectedSession.client}>{children}</SessionProvider>
      ),
    });
    await rejectedAuthHook.unmount();
    await act(async () => {
      rejectSession(new Error('late session failure'));
    });

    const rejectedProfile = makeClient({ session: makeSession('slow-profile-error') });
    let rejectProfile!: (reason: unknown) => void;
    rejectedProfile.profileQuery.maybeSingle.mockReturnValue(
      new Promise((_, reject) => {
        rejectProfile = reject;
      }),
    );
    const rejectedProfileHook = await renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <SessionProvider client={rejectedProfile.client}>{children}</SessionProvider>
      ),
    });
    await waitFor(() => expect(rejectedProfile.profileQuery.maybeSingle).toHaveBeenCalled());
    await rejectedProfileHook.unmount();
    await act(async () => {
      rejectProfile(new Error('late profile failure'));
    });
  });

  it('settles a rejected profile request', async () => {
    const { client, profileQuery } = makeClient({ session: makeSession('rejected-profile') });
    profileQuery.maybeSingle.mockRejectedValueOnce(new Error('profile request failed'));
    const { result } = await renderHook(() => useSession(), {
      wrapper: ({ children }) => <SessionProvider client={client}>{children}</SessionProvider>,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.profile).toBeNull();
  });

  it('returns sign-in errors and resolves successful sign-in', async () => {
    const failing = makeClient({ signInError: { message: 'Invalid credentials' } });
    const first = await renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <SessionProvider client={failing.client}>{children}</SessionProvider>
      ),
    });
    await expect(first.result.current.signIn('admin@example.com', 'bad')).resolves.toBe(
      'Invalid credentials',
    );

    const successful = makeClient();
    const second = await renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <SessionProvider client={successful.client}>{children}</SessionProvider>
      ),
    });
    await expect(second.result.current.signIn('admin@example.com', 'good')).resolves.toBeNull();
  });

  it('throws sign-out errors and resolves successful sign-out', async () => {
    const failing = makeClient({ signOutError: { message: 'Sign-out failed' } });
    const first = await renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <SessionProvider client={failing.client}>{children}</SessionProvider>
      ),
    });
    await expect(first.result.current.signOut()).rejects.toThrow('Sign-out failed');

    const successful = makeClient();
    const second = await renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <SessionProvider client={successful.client}>{children}</SessionProvider>
      ),
    });
    await expect(second.result.current.signOut()).resolves.toBeUndefined();
  });
});
