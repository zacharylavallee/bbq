import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import * as menuAdmin from '../src/data/menuAdmin';
import { mockMenu } from '../src/data/mockMenu';
import { confirmAsync } from '../src/lib/confirm';
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

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

jest.mock('../src/lib/confirm', () => ({
  ...jest.requireActual('../src/lib/confirm'),
  confirmAsync: jest.fn().mockResolvedValue(true),
}));

function withItem(overrides: Partial<(typeof mockMenu.items)[number]>) {
  const menu = {
    ...mockMenu,
    items: mockMenu.items.map((item) => (item.id === 'brisket' ? { ...item, ...overrides } : item)),
  };
  return { getMenu: jest.fn().mockResolvedValue(menu) };
}

function selectedPhoto(uri = 'file:///menu-photo.png') {
  return {
    canceled: false,
    assets: [{ uri, mimeType: 'image/png', width: 400, height: 300 }],
  } as ImagePicker.ImagePickerResult;
}

async function openNewItem() {
  await renderRoutesWithSource(successSource, adminSession, { initialUrl: '/admin' });
  await fireEvent.press(screen.getByRole('button', { name: 'Add item' }));
  await waitFor(() => expect(screen.getByLabelText('Item name')).toBeOnTheScreen());
}

async function fillValidItem() {
  await fireEvent.changeText(screen.getByLabelText('Item name'), 'Burnt Ends');
  await fireEvent.changeText(screen.getByLabelText('Item description'), 'Smoked all day');
  await fireEvent.changeText(screen.getByLabelText('Item price'), '14.50');
  await fireEvent.press(screen.getByRole('button', { name: 'Unit each' }));
}

describe('admin item editor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(confirmAsync).mockResolvedValue(true);
  });

  it('shows field errors for an invalid item', async () => {
    await openNewItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Save item' }));
    expect(screen.getByText('Enter a name.')).toBeOnTheScreen();
    expect(screen.getByText('Enter a price like 12.50.')).toBeOnTheScreen();
    expect(screen.getByText('Choose a unit.')).toBeOnTheScreen();
    expect(menuAdmin.createItem).not.toHaveBeenCalled();
  });

  it('shows the description field error when its limit is exceeded', async () => {
    await openNewItem();
    await fillValidItem();
    await fireEvent.changeText(screen.getByLabelText('Item description'), 'x'.repeat(1001));
    await fireEvent.press(screen.getByRole('button', { name: 'Save item' }));
    expect(screen.getByText('Description must be 1000 characters or fewer.')).toBeOnTheScreen();
  });

  it('validates category and sort order when no category is selected', async () => {
    const source = {
      getMenu: jest.fn().mockResolvedValue({ ...mockMenu, categories: [], items: [] }),
    };
    await renderRoutesWithSource(source, adminSession, {
      initialUrl: '/admin/items/new',
    });
    await waitFor(() => expect(screen.getByLabelText('Item name')).toBeOnTheScreen());
    await fillValidItem();
    await fireEvent.changeText(screen.getByLabelText('Sort order'), 'not-a-number');
    await fireEvent.press(screen.getByRole('button', { name: 'Save item' }));
    expect(screen.getByText('Choose a category.')).toBeOnTheScreen();
    expect(screen.getByText('Enter a whole number.')).toBeOnTheScreen();
  });

  it('creates an item with a library photo', async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue(selectedPhoto());
    jest.mocked(menuAdmin.createItem).mockResolvedValue('new-item-id');
    jest.mocked(menuAdmin.replaceItemPhoto).mockResolvedValue('new-item-id/photo.png');
    await openNewItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose photo' }));
    await waitFor(() => expect(screen.getByLabelText('Photo preview')).toBeOnTheScreen());
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    await fillValidItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Category Sides' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save item' }));
    await waitFor(() =>
      expect(menuAdmin.createItem).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Burnt Ends',
          priceCents: 1450,
          categoryId: 'sides',
          unit: 'each',
        }),
      ),
    );
    await waitFor(() =>
      expect(menuAdmin.replaceItemPhoto).toHaveBeenCalledWith('new-item-id', null, {
        uri: 'file:///menu-photo.png',
        mimeType: 'image/png',
      }),
    );
  });

  it('recovers the created item after a photo upload failure so a retry edits it', async () => {
    const createdItem = { ...mockMenu.items[0], id: 'created-item', name: 'Burnt Ends' };
    let currentMenu = mockMenu;
    const source = {
      getMenu: jest.fn().mockImplementation(async () => currentMenu),
    };
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue(selectedPhoto());
    jest.mocked(menuAdmin.createItem).mockImplementation(async () => {
      currentMenu = { ...currentMenu, items: [...currentMenu.items, createdItem] };
      return createdItem.id;
    });
    jest
      .mocked(menuAdmin.replaceItemPhoto)
      .mockRejectedValueOnce(new Error('photo upload failed'))
      .mockResolvedValueOnce('created-item/photo.png');
    jest.mocked(menuAdmin.updateItem).mockResolvedValue(undefined);

    await renderRoutesWithSource(source, adminSession, {
      initialUrl: '/admin/items/new',
    });
    await waitFor(() => expect(screen.getByLabelText('Item name')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Choose photo' }));
    await waitFor(() => expect(screen.getByLabelText('Photo preview')).toBeOnTheScreen());
    await fillValidItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Save item' }));

    await waitFor(() => expect(screen.getByLabelText('Item name').props.value).toBe('Burnt Ends'));
    expect(screen.getByRole('alert')).toHaveTextContent('photo upload failed');

    await fireEvent.press(screen.getByRole('button', { name: 'Save item' }));
    await waitFor(() =>
      expect(menuAdmin.updateItem).toHaveBeenCalledWith(
        'created-item',
        expect.objectContaining({ name: 'Burnt Ends' }),
      ),
    );
    expect(menuAdmin.createItem).toHaveBeenCalledTimes(1);
  });

  it('accepts a library photo when its MIME type is missing', async () => {
    const uri = 'file:///photo-without-type.png';
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri, width: 400, height: 300 }],
    } as ImagePicker.ImagePickerResult);
    jest.mocked(menuAdmin.createItem).mockResolvedValue('item-without-type');
    jest.mocked(menuAdmin.replaceItemPhoto).mockResolvedValue('item-without-type/photo.png');
    await openNewItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose photo' }));
    await waitFor(() => expect(screen.getByLabelText('Photo preview')).toBeOnTheScreen());
    await fillValidItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Save item' }));
    await waitFor(() =>
      expect(menuAdmin.replaceItemPhoto).toHaveBeenCalledWith('item-without-type', null, {
        uri,
        mimeType: undefined,
      }),
    );
  });

  it('updates an item and removes its existing photo', async () => {
    jest.mocked(menuAdmin.updateItem).mockResolvedValue(undefined);
    jest.mocked(menuAdmin.removeItemPhoto).mockResolvedValue(undefined);
    await renderRoutesWithSource(
      withItem({
        imagePath: 'brisket/old.jpg',
        imageUrl: 'https://photos.test/brisket/old.jpg',
      }),
      adminSession,
      { initialUrl: '/admin/items/brisket' },
    );
    await waitFor(() => expect(screen.getByLabelText('Item name').props.value).toBe('Brisket'));
    expect(screen.getByLabelText('Photo preview')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Item price'), '30.00');
    await fireEvent.press(screen.getByRole('button', { name: 'Remove photo' }));
    expect(screen.getByLabelText('Photo placeholder')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Save item' }));
    await waitFor(() =>
      expect(menuAdmin.updateItem).toHaveBeenCalledWith(
        'brisket',
        expect.objectContaining({ priceCents: 3000 }),
      ),
    );
    await waitFor(() =>
      expect(menuAdmin.removeItemPhoto).toHaveBeenCalledWith('brisket', 'brisket/old.jpg'),
    );
  });

  it('uploads a camera photo after permission is granted', async () => {
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({
      granted: true,
    } as Awaited<ReturnType<typeof ImagePicker.requestCameraPermissionsAsync>>);
    jest
      .mocked(ImagePicker.launchCameraAsync)
      .mockResolvedValue(selectedPhoto('file:///camera.jpg'));
    jest.mocked(menuAdmin.createItem).mockResolvedValue('camera-item');
    jest.mocked(menuAdmin.replaceItemPhoto).mockResolvedValue('camera-item/photo.png');
    await openNewItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    await waitFor(() => expect(screen.getByLabelText('Photo preview')).toBeOnTheScreen());
    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    await fillValidItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Save item' }));
    await waitFor(() =>
      expect(menuAdmin.replaceItemPhoto).toHaveBeenCalledWith('camera-item', null, {
        uri: 'file:///camera.jpg',
        mimeType: 'image/png',
      }),
    );
  });

  it('shows a camera permission error without opening the camera', async () => {
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({
      granted: false,
    } as Awaited<ReturnType<typeof ImagePicker.requestCameraPermissionsAsync>>);
    await openNewItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    await waitFor(() =>
      expect(screen.getByText('Camera permission is required to take a photo.')).toBeOnTheScreen(),
    );
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('reports camera errors and updates catering and availability fields', async () => {
    jest
      .mocked(ImagePicker.requestCameraPermissionsAsync)
      .mockRejectedValueOnce(new Error('camera unavailable'));
    jest.mocked(menuAdmin.createItem).mockResolvedValue('toggle-item');
    await openNewItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    await waitFor(() => expect(screen.getByText('camera unavailable')).toBeOnTheScreen());

    await fillValidItem();
    await fireEvent(screen.getByRole('switch', { name: 'Catering' }), 'valueChange', true);
    await fireEvent(screen.getByRole('switch', { name: 'Available' }), 'valueChange', false);
    await fireEvent.changeText(screen.getByLabelText('Sort order'), '3');
    await fireEvent.press(screen.getByRole('button', { name: 'Save item' }));
    await waitFor(() =>
      expect(menuAdmin.createItem).toHaveBeenCalledWith(
        expect.objectContaining({
          isCatering: true,
          isAvailable: false,
          sortOrder: 3,
        }),
      ),
    );
  });

  it('deletes only after confirmation', async () => {
    jest.mocked(menuAdmin.deleteItem).mockResolvedValue(undefined);
    await renderRoutesWithSource(successSource, adminSession, {
      initialUrl: '/admin/items/brisket',
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Delete item' })).toBeOnTheScreen(),
    );
    jest.mocked(confirmAsync).mockResolvedValueOnce(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete item' }));
    await waitFor(() => expect(confirmAsync).toHaveBeenCalled());
    expect(menuAdmin.deleteItem).not.toHaveBeenCalled();

    jest.mocked(confirmAsync).mockResolvedValueOnce(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete item' }));
    await waitFor(() =>
      expect(menuAdmin.deleteItem).toHaveBeenCalledWith({
        id: 'brisket',
        imagePath: null,
      }),
    );
  });

  it('reports delete failures inline', async () => {
    jest.mocked(menuAdmin.deleteItem).mockRejectedValueOnce(new Error('delete failed'));
    await renderRoutesWithSource(successSource, adminSession, {
      initialUrl: '/admin/items/brisket',
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Delete item' })).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Delete item' }));
    await waitFor(() => expect(screen.getByText('delete failed')).toBeOnTheScreen());
  });

  it('shows save failures and picker errors inline', async () => {
    jest.mocked(menuAdmin.createItem).mockRejectedValueOnce(new Error('save failed'));
    await openNewItem();
    await fillValidItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Save item' }));
    await waitFor(() => expect(screen.getByText('save failed')).toBeOnTheScreen());

    await cleanup();
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockRejectedValueOnce(new Error('picker unavailable'));
    await openNewItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose photo' }));
    await waitFor(() => expect(screen.getByText('picker unavailable')).toBeOnTheScreen());
  });

  it('shows save progress until item creation completes', async () => {
    let finishCreate!: (id: string) => void;
    jest.mocked(menuAdmin.createItem).mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          finishCreate = resolve;
        }),
    );
    await openNewItem();
    await fillValidItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Save item' }));
    expect(screen.getByText('Saving…')).toBeOnTheScreen();
    finishCreate('pending-item');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add item' })).toBeOnTheScreen());
  });

  it('stringifies non-Error failures from the image picker and item writes', async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockRejectedValueOnce('picker unavailable');
    await openNewItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose photo' }));
    await waitFor(() => expect(screen.getByText('picker unavailable')).toBeOnTheScreen());

    await cleanup();
    jest
      .mocked(ImagePicker.requestCameraPermissionsAsync)
      .mockRejectedValueOnce('camera unavailable');
    await openNewItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    await waitFor(() => expect(screen.getByText('camera unavailable')).toBeOnTheScreen());

    await cleanup();
    jest.mocked(menuAdmin.createItem).mockRejectedValueOnce('save unavailable');
    await openNewItem();
    await fillValidItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Save item' }));
    await waitFor(() => expect(screen.getByText('save unavailable')).toBeOnTheScreen());

    await cleanup();
    jest.mocked(menuAdmin.deleteItem).mockRejectedValueOnce('delete unavailable');
    await renderRoutesWithSource(successSource, adminSession, {
      initialUrl: '/admin/items/brisket',
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Delete item' }));
    await waitFor(() => expect(screen.getByText('delete unavailable')).toBeOnTheScreen());
  });

  it('handles cancelled picks, unknown IDs, loading, and source errors', async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: true,
      assets: null,
    } as ImagePicker.ImagePickerResult);
    await openNewItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose photo' }));
    await waitFor(() => expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled());
    expect(screen.queryByLabelText('Photo preview')).toBeNull();

    await cleanup();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [],
    } as ImagePicker.ImagePickerResult);
    await openNewItem();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose photo' }));
    await waitFor(() => expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled());
    expect(screen.queryByLabelText('Photo preview')).toBeNull();

    await cleanup();
    await renderRoutesWithSource(successSource, adminSession, {
      initialUrl: '/admin/items/unknown',
    });
    await waitFor(() => expect(screen.getByText('Item not found')).toBeOnTheScreen());

    await cleanup();
    const loadingSource = { getMenu: () => new Promise<typeof mockMenu>(() => undefined) };
    await renderRoutesWithSource(loadingSource, adminSession, {
      initialUrl: '/admin/items/new',
    });
    expect(screen.getByLabelText('Loading menu item')).toBeOnTheScreen();

    await cleanup();
    const errorSource = { getMenu: jest.fn().mockRejectedValue(new Error('menu unavailable')) };
    await renderRoutesWithSource(errorSource, adminSession, {
      initialUrl: '/admin/items/new',
    });
    await waitFor(() => expect(screen.getByText('menu unavailable')).toBeOnTheScreen());
  });
});
