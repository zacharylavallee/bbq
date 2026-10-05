import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  createCategory,
  deleteCategory,
  renameCategory,
  reorderCategories,
} from '../../../src/data/menuAdmin';
import {
  useInvalidateMenu,
  useMenuSource,
  useMenuVersion,
} from '../../../src/data/MenuSourceProvider';
import { useMenu } from '../../../src/hooks/useMenu';
import { confirmAsync } from '../../../src/lib/confirm';
import { moveItem, validateCategoryName } from '../../../src/lib/menuAdminHelpers';
import { colors } from '../../../src/theme';

export default function AdminCategoriesScreen() {
  const source = useMenuSource();
  const version = useMenuVersion();
  const state = useMenu(source, version);
  const invalidate = useInvalidateMenu();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Loading categories" color={colors.accent} />
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

  const categories = [...state.menu.categories].sort((a, b) => a.sortOrder - b.sortOrder);

  const runWrite = async (write: () => Promise<void>): Promise<boolean> => {
    setBusy(true);
    setError('');
    try {
      await write();
      invalidate();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    const validation = validateCategoryName(newName);
    if (validation) {
      setError(validation);
      return;
    }
    const sortOrder = categories.length
      ? Math.max(...categories.map((category) => category.sortOrder)) + 1
      : 1;
    if (await runWrite(() => createCategory(newName.trim(), sortOrder))) {
      setNewName('');
    }
  };

  const saveRename = async (id: string) => {
    const validation = validateCategoryName(editingName);
    if (validation) {
      setError(validation);
      return;
    }
    if (await runWrite(() => renameCategory(id, editingName.trim()))) {
      setEditingId(null);
    }
  };

  const reorder = async (index: number, delta: -1 | 1) => {
    const moved = moveItem(categories, index, delta);
    await runWrite(() => reorderCategories(moved.map((category) => category.id)));
  };

  const remove = async (categoryId: string, categoryName: string) => {
    const itemCount = state.menu.items.filter((item) => item.categoryId === categoryId).length;
    if (itemCount > 0) {
      setError(
        `Move or delete the ${itemCount} ${itemCount === 1 ? 'item' : 'items'} in this category first.`,
      );
      return;
    }
    const confirmed = await confirmAsync(
      'Delete category?',
      `Delete ${categoryName}? This cannot be undone.`,
      'Delete',
    );
    if (confirmed) {
      await runWrite(() => deleteCategory(categoryId));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Categories</Text>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {categories.map((category, index) => (
        <View key={category.id} style={styles.row}>
          {editingId === category.id ? (
            <TextInput
              accessibilityLabel={`Category name: ${category.name}`}
              onChangeText={setEditingName}
              style={styles.input}
              value={editingName}
            />
          ) : (
            <Text style={styles.categoryName}>{category.name}</Text>
          )}
          <View style={styles.controls}>
            {editingId === category.id ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Save ${category.name}`}
                  disabled={busy}
                  onPress={() => void saveRename(category.id)}
                  style={styles.smallButton}
                >
                  <Text style={styles.smallButtonText}>Save</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Cancel rename ${category.name}`}
                  onPress={() => setEditingId(null)}
                  style={styles.smallButton}
                >
                  <Text style={styles.smallButtonText}>Cancel</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Rename ${category.name}`}
                onPress={() => {
                  setEditingId(category.id);
                  setEditingName(category.name);
                  setError('');
                }}
                style={styles.smallButton}
              >
                <Text style={styles.smallButtonText}>Rename</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Move ${category.name} up`}
              disabled={busy || index === 0}
              onPress={() => void reorder(index, -1)}
              style={styles.smallButton}
            >
              <Text style={styles.smallButtonText}>↑</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Move ${category.name} down`}
              disabled={busy || index === categories.length - 1}
              onPress={() => void reorder(index, 1)}
              style={styles.smallButton}
            >
              <Text style={styles.smallButtonText}>↓</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${category.name}`}
              disabled={busy}
              onPress={() => void remove(category.id, category.name)}
              style={styles.smallButton}
            >
              <Text style={[styles.smallButtonText, styles.deleteText]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <View style={styles.addRow}>
        <TextInput
          accessibilityLabel="New category name"
          onChangeText={setNewName}
          placeholder="New category name"
          style={styles.input}
          value={newName}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add category"
          disabled={busy}
          onPress={() => void add()}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Add category</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  addRow: {
    gap: 10,
    marginTop: 20,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 8,
    padding: 12,
  },
  buttonText: {
    color: colors.surface,
    fontWeight: '700',
  },
  categoryName: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  center: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: colors.paper,
    flexGrow: 1,
    padding: 16,
  },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  deleteText: {
    color: colors.soldOut,
  },
  error: {
    color: colors.soldOut,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.charcoalLight,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: 120,
    padding: 10,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
    padding: 10,
  },
  smallButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  smallButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 16,
  },
});
