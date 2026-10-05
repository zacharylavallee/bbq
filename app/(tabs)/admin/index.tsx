import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { setAvailability } from '../../../src/data/menuAdmin';
import {
  useInvalidateMenu,
  useMenuSource,
  useMenuVersion,
} from '../../../src/data/MenuSourceProvider';
import { useMenu } from '../../../src/hooks/useMenu';
import { groupMenu } from '../../../src/lib/menu';
import { formatItemPrice } from '../../../src/lib/money';
import { colors } from '../../../src/theme';
import type { MenuItem } from '../../../src/types/menu';

export default function AdminMenuScreen() {
  const source = useMenuSource();
  const version = useMenuVersion();
  const state = useMenu(source, version);
  const invalidate = useInvalidateMenu();
  const router = useRouter();
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Loading menu editor" color={colors.accent} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert" style={styles.error}>
          {state.error.message}
        </Text>
        <Pressable accessibilityRole="button" onPress={state.reload} style={styles.actionButton}>
          <Text style={styles.actionText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const changeAvailability = async (item: MenuItem, isAvailable: boolean) => {
    setSavingId(item.id);
    setError('');
    try {
      await setAvailability(item.id, isAvailable);
      invalidate();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Text style={styles.title}>Menu editor</Text>
        <View style={styles.actionGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add item"
            onPress={() => router.push('/admin/items/new')}
            style={styles.actionButton}
          >
            <Text style={styles.actionText}>Add item</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Manage categories"
            onPress={() => router.push('/admin/categories')}
            style={[styles.actionButton, styles.secondaryButton]}
          >
            <Text style={styles.actionText}>Categories</Text>
          </Pressable>
        </View>
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <SectionList
        sections={groupMenu(state.menu, { includeEmpty: true })}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.name}, ${formatItemPrice(item)}`}
              onPress={() => router.push(`/admin/items/${item.id}`)}
              style={styles.itemButton}
            >
              <View style={styles.thumbnail}>
                {item.imageUrl ? (
                  <Image
                    accessibilityLabel={`${item.name} photo`}
                    source={{ uri: item.imageUrl }}
                    contentFit="cover"
                    style={styles.image}
                  />
                ) : (
                  <Ionicons
                    accessibilityLabel={`${item.name} photo placeholder`}
                    name="image-outline"
                    size={22}
                    color={colors.textMuted}
                  />
                )}
              </View>
              <View style={styles.itemText}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>{formatItemPrice(item)}</Text>
              </View>
            </Pressable>
            <Switch
              accessibilityLabel={`Available: ${item.name}`}
              accessibilityRole="switch"
              disabled={savingId === item.id}
              onValueChange={(value) => void changeAvailability(item, value)}
              value={item.isAvailable}
            />
          </View>
        )}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.category.name}</Text>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  actionText: {
    color: colors.surface,
    fontWeight: '700',
  },
  actions: {
    backgroundColor: colors.paper,
    gap: 12,
    padding: 16,
  },
  center: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: colors.paper,
    flex: 1,
  },
  error: {
    color: colors.soldOut,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  image: {
    height: 52,
    width: 52,
  },
  itemButton: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  itemName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  itemPrice: {
    color: colors.accent,
    marginTop: 3,
  },
  itemRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  itemText: {
    flex: 1,
  },
  sectionHeader: {
    backgroundColor: colors.charcoal,
    color: colors.paper,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  secondaryButton: {
    backgroundColor: colors.charcoalLight,
  },
  separator: {
    backgroundColor: colors.paper,
    height: 1,
  },
  thumbnail: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
    width: 52,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
});
