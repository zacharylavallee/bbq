import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRoutesWithSource, successSource } from '../test-utils';

describe('menu screen', () => {
  it('renders sections and items, and navigates to item detail on tap', async () => {
    await renderRoutesWithSource(successSource, undefined, { initialUrl: '/' });
    await waitFor(() => expect(screen.getByText('Meats')).toBeOnTheScreen());
    expect(screen.getByText('Sandwiches')).toBeOnTheScreen();
    expect(screen.getByText('Sides')).toBeOnTheScreen();
    expect(screen.getByText('Desserts')).toBeOnTheScreen();
    expect(screen.getByText('Catering Packages')).toBeOnTheScreen();
    expect(screen.getByText('Brisket')).toBeOnTheScreen();
    expect(screen.getByText('$28.00 / lb')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Brisket, $28.00 / lb' }));
    await waitFor(() =>
      expect(screen.getByText('Slow-smoked for 14 hours over post oak.')).toBeOnTheScreen(),
    );
    expect(screen.getAllByText('$28.00 / lb').length).toBeGreaterThan(0);
  });
});
