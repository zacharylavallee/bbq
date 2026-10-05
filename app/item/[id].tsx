import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useMenuSource } from '../../src/data/MenuSourceProvider';
import { useMenu } from '../../src/hooks/useMenu';
import { findMenuItem } from '../../src/lib/menu';
import { formatItemPrice } from '../../src/lib/money';
import { colors } from '../../src/theme';

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const source = useMenuSource();
  const state = useMenu(source);

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{"Couldn't load the menu."}</Text>
      </View>
    );
  }

  const item = findMenuItem(state.menu, String(id));

  if (!item) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Item' }} />
        <Text style={styles.errorText}>Item not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: item.name }} />
      <View style={styles.header}>
        <Text style={styles.name}>{item.name}</Text>
        {item.isCatering && <Text style={styles.cateringTag}>Catering</Text>}
      </View>
      <Text style={styles.price}>{formatItemPrice(item)}</Text>
      <Text style={styles.description}>{item.description}</Text>
      {!item.isAvailable && <Text style={styles.soldOut}>This item is currently sold out.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  cateringTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tag,
    borderRadius: 4,
    color: colors.charcoal,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  center: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    backgroundColor: colors.paper,
    flex: 1,
    padding: 20,
  },
  description: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  errorText: {
    color: colors.text,
    fontSize: 16,
  },
  header: {
    alignItems: 'flex-start',
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  price: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  soldOut: {
    color: colors.soldOut,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 16,
  },
});
