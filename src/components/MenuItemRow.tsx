import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatItemPrice } from '../lib/money';
import { colors } from '../theme';
import type { MenuItem } from '../types/menu';

interface Props {
  item: MenuItem;
  onPress: (item: MenuItem) => void;
}

export function MenuItemRow({ item, onPress }: Props) {
  const availability = item.isAvailable ? '' : ', sold out';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${formatItemPrice(item)}${availability}`}
      onPress={() => onPress(item)}
      style={styles.row}
    >
      <View style={styles.textBlock}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
      <View style={styles.priceBlock}>
        <Text style={styles.price}>{formatItemPrice(item)}</Text>
        {!item.isAvailable && <Text style={styles.soldOut}>Sold out</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textBlock: {
    flex: 1,
    paddingRight: 12,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  price: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  soldOut: {
    backgroundColor: colors.soldOut,
    borderRadius: 4,
    color: colors.surface,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
