import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { MenuItemRow } from '../../src/components/MenuItemRow';
import { useMenuSource } from '../../src/data/MenuSourceProvider';
import { useMenu } from '../../src/hooks/useMenu';
import { groupMenu } from '../../src/lib/menu';
import { colors } from '../../src/theme';
import type { MenuItem } from '../../src/types/menu';

export default function MenuScreen() {
  const source = useMenuSource();
  const state = useMenu(source);
  const router = useRouter();

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
        <Pressable accessibilityRole="button" onPress={state.reload} style={styles.retryButton}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const onPressItem = (item: MenuItem) => {
    router.push(`/item/${item.id}`);
  };

  return (
    <SectionList
      sections={groupMenu(state.menu)}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MenuItemRow item={item} onPress={onPressItem} />}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.category.name}</Text>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      initialNumToRender={50}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    flex: 1,
    justifyContent: 'center',
  },
  errorText: {
    color: colors.text,
    fontSize: 16,
    marginBottom: 16,
  },
  list: {
    backgroundColor: colors.paper,
    flex: 1,
  },
  retryButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryPressed: {
    backgroundColor: colors.accentDark,
  },
  retryText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeader: {
    backgroundColor: colors.charcoal,
    color: colors.paper,
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  separator: {
    backgroundColor: colors.paper,
    height: 1,
  },
});
