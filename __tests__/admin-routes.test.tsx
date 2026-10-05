import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as menuAdmin from '../src/data/menuAdmin';
import {
  adminSession,
  customerSession,
  renderRoutesWithSource,
  signedOutSession,
  successSource,
} from '../test-utils';
import { mockMenu } from '../src/data/mockMenu';

jest.mock('../src/data/menuAdmin', () => ({
  createCategory: jest.fn(),
  createItem: jest.fn(),
  deleteCategory: jest.fn(),
  deleteItem: jest.fn(),
  removeItemPhoto: jest.fn(),
  renameCategory: jest.fn(),
  reorderCategories: jest.fn(),
  replaceItemPhoto: jest.fn(),
  setAvailability: jest.fn(),
  updateItem: jest.fn(),
}));

describe('admin routes and navigation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('hides the Admin tab from signed-out and customer accounts', async () => {
    await renderRoutesWithSource(successSource, signedOutSession, { initialUrl: '/' });
    expect(screen.queryByRole('button', { name: /^Admin, tab/ })).toBeNull();

    await cleanup();
    await renderRoutesWithSource(successSource, customerSession, {
      initialUrl: '/',
    });
    expect(screen.queryByRole('button', { name: /^Admin, tab/ })).toBeNull();
  });

  it('shows the Admin tab to admins and opens the guarded editor', async () => {
    await renderRoutesWithSource(successSource, adminSession, { initialUrl: '/' });
    expect(screen.getByRole('button', { name: /^Admin, tab/ })).toBeOnTheScreen();
    await act(async () => {
      router.push('/admin');
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add item' })).toBeOnTheScreen());
  });

  it.each(['/admin', '/admin/items/new', '/admin/categories'])(
    'redirects non-admins away from %s',
    async (path) => {
      await renderRoutesWithSource(successSource, customerSession, {
        initialUrl: path,
      });
      await waitFor(() => expect(screen.getByText('customer@bbq.local')).toBeOnTheScreen());
      await cleanup();
      await renderRoutesWithSource(successSource, signedOutSession, {
        initialUrl: path,
      });
      await waitFor(() =>
        expect(screen.getByText('Sign in to view your account.')).toBeOnTheScreen(),
      );
    },
  );

  it('shows a loading state while the session is unresolved', async () => {
    await renderRoutesWithSource(
      successSource,
      { ...customerSession, isLoading: true },
      {
        initialUrl: '/admin',
      },
    );
    expect(screen.getByLabelText('Loading admin')).toBeOnTheScreen();
  });

  it('invalidates the shared menu after changing availability and opens item editor', async () => {
    const getMenu = jest.fn().mockResolvedValue(await successSource.getMenu());
    const source = { getMenu };
    await renderRoutesWithSource(source, adminSession, { initialUrl: '/admin' });
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Available: Brisket' })).toBeOnTheScreen(),
    );

    await fireEvent(
      screen.getByRole('switch', { name: 'Available: Brisket' }),
      'valueChange',
      false,
    );
    await waitFor(() => expect(menuAdmin.setAvailability).toHaveBeenCalledWith('brisket', false));
    await waitFor(() => expect(getMenu).toHaveBeenCalledTimes(2));

    await fireEvent.press(screen.getByRole('button', { name: 'Edit Brisket, $28.00 / lb' }));
    await waitFor(() => expect(screen.getByLabelText('Item name')).toBeOnTheScreen());
  });

  it('reflects an admin availability change in the customer menu after invalidation', async () => {
    let currentMenu = mockMenu;
    const getMenu = jest.fn().mockImplementation(() => Promise.resolve(currentMenu));
    const source = { getMenu };
    jest.mocked(menuAdmin.setAvailability).mockImplementation(async (id, isAvailable) => {
      currentMenu = {
        ...currentMenu,
        items: currentMenu.items.map((item) => (item.id === id ? { ...item, isAvailable } : item)),
      };
    });

    await renderRoutesWithSource(source, adminSession, { initialUrl: '/' });
    await act(async () => {
      router.push('/admin');
    });
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Available: Brisket' })).toBeOnTheScreen(),
    );
    await fireEvent(
      screen.getByRole('switch', { name: 'Available: Brisket' }),
      'valueChange',
      false,
    );
    await waitFor(() => expect(menuAdmin.setAvailability).toHaveBeenCalledWith('brisket', false));
    await act(async () => {
      router.replace('/');
    });
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Brisket, $28.00 / lb, sold out' }),
      ).toBeOnTheScreen(),
    );
  });

  it('navigates to category management and renders image thumbnails', async () => {
    const menu = {
      ...mockMenu,
      items: mockMenu.items.map((item) =>
        item.id === 'brisket' ? { ...item, imageUrl: 'https://photos.test/brisket.jpg' } : item,
      ),
    };
    const source = { getMenu: jest.fn().mockResolvedValue(menu) };
    await renderRoutesWithSource(source, adminSession, { initialUrl: '/admin' });
    await waitFor(() => expect(screen.getByLabelText('Brisket photo')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Manage categories' }));
    await waitFor(() => expect(screen.getByLabelText('New category name')).toBeOnTheScreen());
  });

  it('shows menu write failures inline', async () => {
    jest.mocked(menuAdmin.setAvailability).mockRejectedValueOnce(new Error('write failed'));
    await renderRoutesWithSource(successSource, adminSession, {
      initialUrl: '/admin',
    });
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Available: Brisket' })).toBeOnTheScreen(),
    );
    await fireEvent(
      screen.getByRole('switch', { name: 'Available: Brisket' }),
      'valueChange',
      false,
    );
    await waitFor(() => expect(screen.getByText('write failed')).toBeOnTheScreen());
  });

  it('stringifies menu write failures that are not Error objects', async () => {
    jest.mocked(menuAdmin.setAvailability).mockRejectedValueOnce('write unavailable');
    await renderRoutesWithSource(successSource, adminSession, {
      initialUrl: '/admin',
    });
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Available: Brisket' })).toBeOnTheScreen(),
    );
    await fireEvent(
      screen.getByRole('switch', { name: 'Available: Brisket' }),
      'valueChange',
      false,
    );
    await waitFor(() => expect(screen.getByText('write unavailable')).toBeOnTheScreen());
  });

  it('renders a retry action when the menu source fails', async () => {
    const source = { getMenu: jest.fn().mockRejectedValue(new Error('menu unavailable')) };
    await renderRoutesWithSource(source, adminSession, { initialUrl: '/admin' });
    await waitFor(() => expect(screen.getByText('menu unavailable')).toBeOnTheScreen());
    expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
  });
});
