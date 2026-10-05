import { act, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRoutesWithSource, successSource } from '../test-utils';

describe('tabs', () => {
  it('renders orders and a signed-out account', async () => {
    await renderRoutesWithSource(successSource, undefined, { initialUrl: '/orders' });
    await waitFor(() =>
      expect(screen.getByText('Your orders will show up here.')).toBeOnTheScreen(),
    );

    await act(async () => {
      router.push('/account');
    });
    await waitFor(() =>
      expect(screen.getByText('Sign in to view your account.')).toBeOnTheScreen(),
    );
  });
});
