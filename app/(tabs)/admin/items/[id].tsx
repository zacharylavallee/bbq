import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  createItem,
  deleteItem,
  removeItemPhoto,
  replaceItemPhoto,
  updateItem,
} from '../../../../src/data/menuAdmin';
import {
  useInvalidateMenu,
  useMenuSource,
  useMenuVersion,
} from '../../../../src/data/MenuSourceProvider';
import { useMenu } from '../../../../src/hooks/useMenu';
import { findMenuItem } from '../../../../src/lib/menu';
import {
  formValuesFromItem,
  validateMenuItemInput,
  type MenuItemFormValues,
} from '../../../../src/lib/menuAdminHelpers';
import { confirmAsync } from '../../../../src/lib/confirm';
import { colors } from '../../../../src/theme';
import type { MenuItem, MenuUnit } from '../../../../src/types/menu';

const units: MenuUnit[] = ['each', 'lb', 'tray'];

export default function AdminItemScreen() {
  const { id, error: routeError } = useLocalSearchParams<{ id: string; error?: string }>();
  const isNew = String(id) === 'new';
  const source = useMenuSource();
  const version = useMenuVersion();
  const state = useMenu(source, version);
  const invalidate = useInvalidateMenu();
  const router = useRouter();
  const item =
    state.status === 'ready' && !isNew ? findMenuItem(state.menu, String(id)) : undefined;
  const initialValues = formValuesFromItem(
    item,
    state.status === 'ready' ? (state.menu.categories[0]?.id ?? '') : '',
  );
  const [draft, setDraft] = useState<{ id: string; values: MenuItemFormValues } | null>(null);
  const values = draft?.id === String(id) ? draft.values : initialValues;
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof MenuItemFormValues, string>>>(
    {},
  );
  const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; mimeType?: string } | null>(
    null,
  );
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const displayedError = error || (typeof routeError === 'string' ? routeError : '');

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Loading menu item" color={colors.accent} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert" style={styles.error}>
          {state.error.message}
        </Text>
        <Pressable accessibilityRole="button" onPress={state.reload} style={styles.button}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!isNew && !item) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Menu item' }} />
        <Text style={styles.error}>Item not found</Text>
      </View>
    );
  }

  const updateField = <K extends keyof MenuItemFormValues>(
    field: K,
    value: MenuItemFormValues[K],
  ) => {
    setDraft((current) => {
      const currentValues = current?.id === String(id) ? current.values : initialValues;
      return { id: String(id), values: { ...currentValues, [field]: value } };
    });
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const acceptPhoto = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedPhoto({ uri: asset.uri, mimeType: asset.mimeType ?? undefined });
      setPhotoRemoved(false);
      setError('');
    }
  };

  const choosePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      acceptPhoto(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Camera permission is required to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      acceptPhoto(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const save = async () => {
    const validation = validateMenuItemInput(values);
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      return;
    }

    if (routeError) {
      router.setParams({ error: undefined });
    }
    setBusy(true);
    setError('');
    setFieldErrors({});
    let createdItemId: string | null = null;
    try {
      const itemId = isNew ? await createItem(validation.value) : String(id);
      if (isNew) {
        createdItemId = itemId;
      }
      if (!isNew) {
        await updateItem(itemId, validation.value);
      }
      if (selectedPhoto) {
        await replaceItemPhoto(itemId, item?.imagePath ?? null, selectedPhoto);
      } else if (photoRemoved && item?.imagePath) {
        await removeItemPhoto(item.id, item.imagePath);
      }
      invalidate();
      router.back();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      setError(message);
      if (createdItemId) {
        invalidate();
        router.replace(`/admin/items/${createdItemId}?error=${encodeURIComponent(message)}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = () => {
    setSelectedPhoto(null);
    setPhotoRemoved(true);
  };

  const remove = async (currentItem: MenuItem) => {
    const confirmed = await confirmAsync(
      'Delete item?',
      `Delete ${currentItem.name}? This cannot be undone.`,
      'Delete',
    );
    if (!confirmed) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await deleteItem({ id: currentItem.id, imagePath: currentItem.imagePath });
      invalidate();
      router.back();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const displayedPhoto = selectedPhoto?.uri ?? (!photoRemoved ? item?.imageUrl : null);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: isNew ? 'Add menu item' : item!.name }} />
      {displayedError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {displayedError}
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel="Item name"
        onChangeText={(value) => updateField('name', value)}
        placeholder="Name"
        style={styles.input}
        value={values.name}
      />
      {fieldErrors.name ? <Text style={styles.fieldError}>{fieldErrors.name}</Text> : null}
      <TextInput
        accessibilityLabel="Item description"
        multiline
        onChangeText={(value) => updateField('description', value)}
        placeholder="Description"
        style={[styles.input, styles.multiline]}
        value={values.description}
      />
      {fieldErrors.description ? (
        <Text style={styles.fieldError}>{fieldErrors.description}</Text>
      ) : null}
      <TextInput
        accessibilityLabel="Item price"
        keyboardType="decimal-pad"
        onChangeText={(value) => updateField('price', value)}
        placeholder="Price"
        style={styles.input}
        value={values.price}
      />
      {fieldErrors.price ? <Text style={styles.fieldError}>{fieldErrors.price}</Text> : null}
      <Text style={styles.label}>Unit</Text>
      <View style={styles.chips}>
        {units.map((unit) => (
          <Pressable
            key={unit}
            accessibilityRole="button"
            accessibilityLabel={`Unit ${unit}`}
            accessibilityState={{ selected: values.unit === unit }}
            onPress={() => updateField('unit', unit)}
            style={[styles.chip, values.unit === unit && styles.selectedChip]}
          >
            <Text style={[styles.chipText, values.unit === unit && styles.selectedChipText]}>
              {unit}
            </Text>
          </Pressable>
        ))}
      </View>
      {fieldErrors.unit ? <Text style={styles.fieldError}>{fieldErrors.unit}</Text> : null}
      <Text style={styles.label}>Category</Text>
      <View style={styles.chips}>
        {state.menu.categories.map((category) => (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityLabel={`Category ${category.name}`}
            accessibilityState={{ selected: values.categoryId === category.id }}
            onPress={() => updateField('categoryId', category.id)}
            style={[styles.chip, values.categoryId === category.id && styles.selectedChip]}
          >
            <Text
              style={[
                styles.chipText,
                values.categoryId === category.id && styles.selectedChipText,
              ]}
            >
              {category.name}
            </Text>
          </Pressable>
        ))}
      </View>
      {fieldErrors.categoryId ? (
        <Text style={styles.fieldError}>{fieldErrors.categoryId}</Text>
      ) : null}
      <View style={styles.switchRow}>
        <Text style={styles.label}>Catering</Text>
        <Switch
          accessibilityLabel="Catering"
          onValueChange={(value) => updateField('isCatering', value)}
          value={values.isCatering}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.label}>Available</Text>
        <Switch
          accessibilityLabel="Available"
          onValueChange={(value) => updateField('isAvailable', value)}
          value={values.isAvailable}
        />
      </View>
      <TextInput
        accessibilityLabel="Sort order"
        keyboardType="number-pad"
        onChangeText={(value) => updateField('sortOrder', value)}
        placeholder="Sort order"
        style={styles.input}
        value={values.sortOrder}
      />
      {fieldErrors.sortOrder ? (
        <Text style={styles.fieldError}>{fieldErrors.sortOrder}</Text>
      ) : null}
      <Text style={styles.label}>Photo</Text>
      {displayedPhoto ? (
        <Image
          accessibilityLabel="Photo preview"
          source={{ uri: displayedPhoto }}
          contentFit="cover"
          style={styles.photo}
        />
      ) : (
        <View
          accessibilityRole="image"
          accessibilityLabel="Photo placeholder"
          style={styles.photoPlaceholder}
        >
          <Ionicons name="image-outline" size={36} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.photoActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose photo"
          disabled={busy}
          onPress={() => void choosePhoto()}
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>Choose photo</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          disabled={busy}
          onPress={() => void takePhoto()}
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>Take photo</Text>
        </Pressable>
        {(selectedPhoto || item?.imagePath) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
            disabled={busy}
            onPress={removePhoto}
            style={styles.smallButton}
          >
            <Text style={[styles.smallButtonText, styles.removeText]}>Remove photo</Text>
          </Pressable>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Save item"
        disabled={busy}
        onPress={() => void save()}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{busy ? 'Saving…' : 'Save item'}</Text>
      </Pressable>
      {!isNew && item && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete item"
          disabled={busy}
          onPress={() => void remove(item)}
          style={[styles.button, styles.deleteButton]}
        >
          <Text style={styles.buttonText}>Delete item</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 8,
    marginTop: 18,
    padding: 13,
  },
  buttonText: {
    color: colors.surface,
    fontWeight: '700',
  },
  center: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.charcoalLight,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    color: colors.text,
    fontWeight: '600',
  },
  content: {
    backgroundColor: colors.paper,
    flexGrow: 1,
    padding: 16,
  },
  deleteButton: {
    backgroundColor: colors.soldOut,
    marginBottom: 20,
  },
  error: {
    color: colors.soldOut,
    marginBottom: 12,
  },
  fieldError: {
    color: colors.soldOut,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.charcoalLight,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    padding: 12,
  },
  label: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 10,
  },
  multiline: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  photo: {
    aspectRatio: 4 / 3,
    borderRadius: 10,
    width: '100%',
  },
  photoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  photoPlaceholder: {
    alignItems: 'center',
    aspectRatio: 4 / 3,
    backgroundColor: colors.surface,
    borderColor: colors.charcoalLight,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    width: '100%',
  },
  removeText: {
    color: colors.soldOut,
  },
  selectedChip: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  selectedChipText: {
    color: colors.surface,
  },
  smallButton: {
    backgroundColor: colors.surface,
    borderColor: colors.charcoalLight,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
