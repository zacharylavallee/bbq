import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  name: string | null;
  phone: string | null;
  role: 'customer' | 'admin';
}

export interface SessionContextValue {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
}

type AuthResult = {
  client: SupabaseClient<Database>;
  session: Session | null;
};

type ProfileResult = {
  auth: AuthResult;
  profile: Profile | null;
};

const emptySessionContext: SessionContextValue = {
  session: null,
  profile: null,
  isAdmin: false,
  isLoading: false,
  signIn: async () => "Sign-in isn't set up yet.",
  signOut: async () => undefined,
};

export const SessionContext = createContext<SessionContextValue>(emptySessionContext);

export function SessionProvider({
  client = supabase,
  children,
}: {
  client?: SupabaseClient<Database> | null;
  children: ReactNode;
}) {
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);
  const [profileResult, setProfileResult] = useState<ProfileResult | null>(null);
  const session = client && authResult?.client === client ? authResult.session : null;
  const profile = profileResult?.auth === authResult ? profileResult.profile : null;
  const authLoading = Boolean(client && authResult?.client !== client);
  const profileLoading = Boolean(session && profileResult?.auth !== authResult);

  useEffect(() => {
    if (!client) {
      return;
    }

    let active = true;
    let authChangeReceived = false;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) {
        return;
      }
      authChangeReceived = true;
      setAuthResult({ client, session: nextSession });
    });

    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || authChangeReceived) {
          return;
        }
        setAuthResult({ client, session: error ? null : data.session });
      })
      .catch(() => {
        if (active && !authChangeReceived) {
          setAuthResult({ client, session: null });
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    if (!client || !authResult || authResult.client !== client || !authResult.session?.user.id) {
      return;
    }

    let active = true;
    void Promise.resolve(
      client
        .from('profiles')
        .select('id, name, phone, role')
        .eq('id', authResult.session.user.id)
        .maybeSingle(),
    )
      .then(({ data, error }) => {
        if (!active) {
          return;
        }
        setProfileResult({
          auth: authResult,
          profile:
            !error && data
              ? {
                  id: data.id,
                  name: data.name,
                  phone: data.phone,
                  role: data.role === 'admin' ? 'admin' : 'customer',
                }
              : null,
        });
      })
      .catch(() => {
        if (active) {
          setProfileResult({ auth: authResult, profile: null });
        }
      });

    return () => {
      active = false;
    };
  }, [authResult, client]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!client) {
        return "Sign-in isn't set up yet.";
      }
      const { error } = await client.auth.signInWithPassword({ email, password });
      return error?.message ?? null;
    },
    [client],
  );

  const signOut = useCallback(async () => {
    if (!client) {
      return;
    }
    const { error } = await client.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }, [client]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      profile,
      isAdmin: profile?.role === 'admin',
      isLoading: authLoading || profileLoading,
      signIn,
      signOut,
    }),
    [session, profile, authLoading, profileLoading, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
