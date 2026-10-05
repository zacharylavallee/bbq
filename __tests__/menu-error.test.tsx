import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { mockMenu } from '../src/data/mockMenu';
import type { MenuSource } from '../src/data/menuSource';
import { renderRoutesWithSource } from '../test-utils';

describe('menu screen error state', () => {
  it('shows an error and recovers via Try again', async () => {
    const getMenu = jest
      .fn<ReturnType<MenuSource['getMenu']>, []>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(mockMenu);
    await renderRoutesWithSource({ getMenu }, undefined, { initialUrl: '/' });
    await waitFor(() => expect(screen.getByText("Couldn't load the menu.")).toBeOnTheScreen());
    await fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => expect(screen.getByText('Brisket')).toBeOnTheScreen());
    expect(getMenu).toHaveBeenCalledTimes(2);
  });
});
