import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { routesWithSource, successSource } from '../test-utils';

describe('menu screen', () => {
  it('renders sections and items, and navigates to item detail on tap', async () => {
    await renderRouter(routesWithSource(successSource), { initialUrl: '/' });
    await waitFor(() => expect(screen.getByText('Meats')).toBeOnTheScreen());
    expect(screen.getByText('Sandwiches')).toBeOnTheScreen();
    expect(screen.getByText('Sides')).toBeOnTheScreen();
    expect(screen.getByText('Desserts')).toBeOnTheScreen();
    expect(screen.getByText('Catering Packages')).toBeOnTheScreen();
    expect(screen.getByText('Brisket')).toBeOnTheScreen();
    expect(screen.getByText('$28.00 / lb')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Brisket, $28.00 / lb' }));
    await waitFor(() =>
      expect(screen.getByText('Slow-smoked for 14 hours over post oak.')).toBeOnTheScreen(),
    );
    expect(screen.getAllByText('$28.00 / lb').length).toBeGreaterThan(0);
  });
});
