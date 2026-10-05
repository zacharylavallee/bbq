import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as menuAdmin from '../src/data/menuAdmin';
import { confirmAsync } from '../src/lib/confirm';
import { mockMenu } from '../src/data/mockMenu';
import { adminSession, renderRoutesWithSource, successSource } from '../test-utils';

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

jest.mock('../src/lib/confirm', () => ({
  ...jest.requireActual('../src/lib/confirm'),
  confirmAsync: jest.fn().mockResolvedValue(true),
}));

describe('admin category management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(confirmAsync).mockResolvedValue(true);
  });

  it('blocks deleting a category that still contains menu items', async () => {
    await renderRoutesWithSource(successSource, adminSession, {
      initialUrl: '/admin/categories',
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Delete Meats' }));
    expect(
      screen.getByText('Move or delete the 4 items in this category first.'),
    ).toBeOnTheScreen();
    expect(menuAdmin.deleteCategory).not.toHaveBeenCalled();
    expect(confirmAsync).not.toHaveBeenCalled();
  });

  it('uses the singular item count and starts empty category orders at one', async () => {
    const menu = {
      ...mockMenu,
      categories: [{ id: 'empty', name: 'Empty', sortOrder: 1 }],
      items: [{ ...mockMenu.items[0], categoryId: 'empty' }],
    };
    const source = { getMenu: jest.fn().mockResolvedValue(menu) };
    await renderRoutesWithSource(source, adminSession, {
      initialUrl: '/admin/categories',
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Delete Empty' }));
    expect(screen.getByText('Move or delete the 1 item in this category first.')).toBeOnTheScreen();
    await cleanup();

    const emptySource = {
      getMenu: jest.fn().mockResolvedValue({ ...menu, categories: [], items: [] }),
    };
    await renderRoutesWithSource(emptySource, adminSession, {
      initialUrl: '/admin/categories',
    });
    await fireEvent.changeText(screen.getByLabelText('New category name'), 'First');
    await fireEvent.press(screen.getByRole('button', { name: 'Add category' }));
    await waitFor(() => expect(menuAdmin.createCategory).toHaveBeenCalledWith('First', 1));
  });

  it('validates and creates an appended category', async () => {
    await renderRoutesWithSource(successSource, adminSession, {
      initialUrl: '/admin/categories',
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Add category' }));
    expect(screen.getByText('Enter a category name.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('New category name'), '  Sides Plus  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Add category' }));
    await waitFor(() => expect(menuAdmin.createCategory).toHaveBeenCalledWith('Sides Plus', 6));
  });

  it('preserves a category draft after a non-Error write failure', async () => {
    jest.mocked(menuAdmin.createCategory).mockRejectedValueOnce('category write failed');
    await renderRoutesWithSource(successSource, adminSession, {
      initialUrl: '/admin/categories',
    });
    await fireEvent.changeText(screen.getByLabelText('New category name'), 'Sides Plus');
    await fireEvent.press(screen.getByRole('button', { name: 'Add category' }));
    await waitFor(() => expect(screen.getByText('category write failed')).toBeOnTheScreen());
    expect(screen.getByLabelText('New category name').props.value).toBe('Sides Plus');
  });

  it('renames categories and keeps the editor open after a failed write', async () => {
    jest.mocked(menuAdmin.renameCategory).mockRejectedValueOnce(new Error('rename failed'));
    await renderRoutesWithSource(successSource, adminSession, {
      initialUrl: '/admin/categories',
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Rename Meats' }));
    await fireEvent.changeText(screen.getByLabelText('Category name: Meats'), 'Smokehouse');
    await fireEvent.press(screen.getByRole('button', { name: 'Save Meats' }));
    await waitFor(() => expect(screen.getByText('rename failed')).toBeOnTheScreen());
    expect(screen.getByLabelText('Category name: Meats').props.value).toBe('Smokehouse');
  });

  it('saves a renamed category and cancels an inline edit', async () => {
    await renderRoutesWithSource(successSource, adminSession, {
      initialUrl: '/admin/categories',
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Rename Meats' }));
    await fireEvent.changeText(screen.getByLabelText('Category name: Meats'), 'Smokehouse');
    await fireEvent.press(screen.getByRole('button', { name: 'Save Meats' }));
    await waitFor(() =>
      expect(menuAdmin.renameCategory).toHaveBeenCalledWith('meats', 'Smokehouse'),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Rename Sandwiches' }));
    await fireEvent.changeText(screen.getByLabelText('Category name: Sandwiches'), ' ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save Sandwiches' }));
    expect(screen.getByText('Enter a category name.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel rename Sandwiches' }));
    expect(screen.queryByLabelText('Category name: Sandwiches')).toBeNull();
  });

  it('reorders categories and persists the new order', async () => {
    await renderRoutesWithSource(successSource, adminSession, {
      initialUrl: '/admin/categories',
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Move Sandwiches up' }));
    await waitFor(() =>
      expect(menuAdmin.reorderCategories).toHaveBeenCalledWith([
        'sandwiches',
        'meats',
        'sides',
        'desserts',
        'catering',
      ]),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Move Meats down' }));
    await waitFor(() =>
      expect(menuAdmin.reorderCategories).toHaveBeenLastCalledWith([
        'sandwiches',
        'meats',
        'sides',
        'desserts',
        'catering',
      ]),
    );
  });

  it('confirms deletion and leaves the category when the user cancels', async () => {
    const emptyMenu = {
      ...mockMenu,
      categories: [{ id: 'empty', name: 'Empty', sortOrder: 1 }],
      items: [],
    };
    const source = { getMenu: jest.fn().mockResolvedValue(emptyMenu) };
    await renderRoutesWithSource(source, adminSession, {
      initialUrl: '/admin/categories',
    });
    jest.mocked(confirmAsync).mockResolvedValueOnce(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete Empty' }));
    await waitFor(() => expect(confirmAsync).toHaveBeenCalled());
    expect(menuAdmin.deleteCategory).not.toHaveBeenCalled();

    jest.mocked(confirmAsync).mockResolvedValueOnce(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete Empty' }));
    await waitFor(() => expect(menuAdmin.deleteCategory).toHaveBeenCalledWith('empty'));
  });

  it('shows a server-side category delete error', async () => {
    const emptyMenu = {
      ...mockMenu,
      categories: [{ id: 'empty', name: 'Empty', sortOrder: 1 }],
      items: [],
    };
    jest
      .mocked(menuAdmin.deleteCategory)
      .mockRejectedValueOnce(
        new Error('This category still has items. Move or delete them first.'),
      );
    const source = { getMenu: jest.fn().mockResolvedValue(emptyMenu) };
    await renderRoutesWithSource(source, adminSession, {
      initialUrl: '/admin/categories',
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Delete Empty' }));
    await waitFor(() =>
      expect(
        screen.getByText('This category still has items. Move or delete them first.'),
      ).toBeOnTheScreen(),
    );
  });

  it('reports loading and source errors', async () => {
    const loadingSource = {
      getMenu: () => new Promise<typeof mockMenu>(() => undefined),
    };
    await renderRoutesWithSource(loadingSource, adminSession, {
      initialUrl: '/admin/categories',
    });
    expect(screen.getByLabelText('Loading categories')).toBeOnTheScreen();

    await cleanup();
    const errorSource = { getMenu: jest.fn().mockRejectedValue(new Error('menu failed')) };
    await renderRoutesWithSource(errorSource, adminSession, {
      initialUrl: '/admin/categories',
    });
    await waitFor(() => expect(screen.getByText('menu failed')).toBeOnTheScreen());
  });
});
