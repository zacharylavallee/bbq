import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSession } from '../../../src/auth/SessionProvider';
import { colors } from '../../../src/theme';

export default function AdminLayout() {
  const { isAdmin, isLoading } = useSession();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Loading admin" color={colors.accent} />
      </View>
    );
  }

  if (!isAdmin) {
    return <Redirect href="/account" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.charcoal },
        headerTintColor: colors.paper,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Menu editor' }} />
      <Stack.Screen name="items/[id]" options={{ title: 'Menu item' }} />
      <Stack.Screen name="categories" options={{ title: 'Categories' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    flex: 1,
    justifyContent: 'center',
  },
});
