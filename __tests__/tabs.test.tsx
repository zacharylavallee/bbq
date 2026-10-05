import { act, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { routesWithSource, successSource } from '../test-utils';

describe('tabs', () => {
  it('renders the orders and account placeholders', async () => {
    await renderRouter(routesWithSource(successSource), { initialUrl: '/orders' });
    await waitFor(() =>
      expect(screen.getByText('Your orders will show up here.')).toBeOnTheScreen(),
    );

    await act(async () => {
      router.push('/account');
    });
    await waitFor(() => expect(screen.getByText('Sign in coming soon.')).toBeOnTheScreen());
  });
});
