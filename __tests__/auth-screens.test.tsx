import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { Session } from '@supabase/supabase-js';
import {
  adminSession,
  customerSession,
  renderRoutesWithSource,
  signedOutSession,
  successSource,
} from '../test-utils';
import type { SessionContextValue } from '../src/auth/SessionProvider';

describe('account screen', () => {
  it('offers sign-in to signed-out customers', async () => {
    await renderRoutesWithSource(successSource, signedOutSession, { initialUrl: '/account' });
    expect(screen.getByText('Sign in to view your account.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeOnTheScreen());
  });

  it('shows the signed-in account and admin label, then signs out', async () => {
    const signOut = jest.fn().mockResolvedValue(undefined);
    const session: SessionContextValue = { ...adminSession, signOut };
    await renderRoutesWithSource(successSource, session, { initialUrl: '/account' });
    expect(screen.getByText('admin@bbq.local')).toBeOnTheScreen();
    expect(screen.getByLabelText('Admin account label')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });

  it('shows loading and reports sign-out failures', async () => {
    const loading: SessionContextValue = { ...signedOutSession, isLoading: true };
    const loadingResult = await renderRoutesWithSource(successSource, loading, {
      initialUrl: '/account',
    });
    expect(loadingResult.getByLabelText('Loading account')).toBeOnTheScreen();

    await cleanup();
    const signOut = jest.fn().mockRejectedValue(new Error('Sign-out unavailable'));
    await renderRoutesWithSource(
      successSource,
      { ...customerSession, signOut },
      {
        initialUrl: '/account',
      },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(screen.getByText('Sign-out unavailable')).toBeOnTheScreen());
  });

  it('shows a pending sign-out state and stringifies non-Error failures', async () => {
    let finishSignOut!: () => void;
    const signOut = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSignOut = resolve;
        }),
    );
    await renderRoutesWithSource(
      successSource,
      { ...customerSession, signOut },
      { initialUrl: '/account' },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByText('Signing out…')).toBeOnTheScreen();
    finishSignOut();
    await waitFor(() => expect(screen.getByText('Sign out')).toBeOnTheScreen());

    await cleanup();
    const failingSignOut = jest.fn().mockRejectedValue('Sign-out unavailable');
    await renderRoutesWithSource(
      successSource,
      { ...customerSession, signOut: failingSignOut },
      { initialUrl: '/account' },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(screen.getByText('Sign-out unavailable')).toBeOnTheScreen());
  });

  it('uses the profile name when the session has no email', async () => {
    const session = {
      ...customerSession.session,
      user: { ...customerSession.session?.user, email: undefined },
    } as Session;
    await renderRoutesWithSource(
      successSource,
      { ...customerSession, session },
      {
        initialUrl: '/account',
      },
    );
    expect(screen.getByText('Customer')).toBeOnTheScreen();
  });

  it('uses the generic account label when email and profile name are unavailable', async () => {
    const session = {
      ...customerSession.session,
      user: { ...customerSession.session?.user, email: undefined },
    } as Session;
    await renderRoutesWithSource(
      successSource,
      {
        ...customerSession,
        session,
        profile: null,
      },
      { initialUrl: '/account' },
    );
    expect(screen.getAllByText('Account')).toHaveLength(3);
  });
});

describe('sign-in screen', () => {
  it('shows backend errors and submits the email and password', async () => {
    const signIn = jest.fn().mockResolvedValue('Invalid credentials');
    await renderRoutesWithSource(
      successSource,
      { ...signedOutSession, signIn },
      {
        initialUrl: '/sign-in',
      },
    );
    await fireEvent.changeText(screen.getByLabelText('Email'), 'admin@bbq.local');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'wrong-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Submit sign in' }));
    await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeOnTheScreen());
    expect(signIn).toHaveBeenCalledWith('admin@bbq.local', 'wrong-password');
  });

  it('navigates to the account after successful sign-in', async () => {
    const signIn = jest.fn().mockResolvedValue(null);
    await renderRoutesWithSource(
      successSource,
      { ...signedOutSession, signIn },
      {
        initialUrl: '/sign-in',
      },
    );
    await fireEvent.changeText(screen.getByLabelText('Email'), ' admin@bbq.local ');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'admin-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Submit sign in' }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith('admin@bbq.local', 'admin-password'));
    await waitFor(() =>
      expect(screen.getByText('Sign in to view your account.')).toBeOnTheScreen(),
    );
  });

  it('shows a pending sign-in state and stringifies non-Error failures', async () => {
    let finishSignIn!: (message: string | null) => void;
    const signIn = jest.fn(
      () =>
        new Promise<string | null>((resolve) => {
          finishSignIn = resolve;
        }),
    );
    await renderRoutesWithSource(
      successSource,
      { ...signedOutSession, signIn },
      { initialUrl: '/sign-in' },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Submit sign in' }));
    expect(screen.getByText('Signing in…')).toBeOnTheScreen();
    finishSignIn('Invalid credentials');
    await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeOnTheScreen());

    await cleanup();
    const failingSignIn = jest.fn().mockRejectedValue('Authentication unavailable');
    await renderRoutesWithSource(
      successSource,
      { ...signedOutSession, signIn: failingSignIn },
      { initialUrl: '/sign-in' },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Submit sign in' }));
    await waitFor(() => expect(screen.getByText('Authentication unavailable')).toBeOnTheScreen());
  });

  it('reports thrown errors, shows loading, and redirects existing sessions', async () => {
    const signIn = jest.fn().mockRejectedValue(new Error('Network error'));
    await renderRoutesWithSource(
      successSource,
      { ...signedOutSession, signIn },
      {
        initialUrl: '/sign-in',
      },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Submit sign in' }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeOnTheScreen());

    await cleanup();
    await renderRoutesWithSource(
      successSource,
      { ...signedOutSession, isLoading: true },
      {
        initialUrl: '/sign-in',
      },
    );
    expect(screen.getByLabelText('Loading sign-in')).toBeOnTheScreen();

    await cleanup();
    await renderRoutesWithSource(successSource, customerSession, {
      initialUrl: '/sign-in',
    });
    expect(screen.getByText('customer@bbq.local')).toBeOnTheScreen();
  });
});
