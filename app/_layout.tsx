import { Stack } from 'expo-router';
import { SessionProvider } from '../src/auth/SessionProvider';
import { MenuSourceProvider } from '../src/data/MenuSourceProvider';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <SessionProvider>
      <MenuSourceProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.charcoal },
            headerTintColor: colors.paper,
            headerTitleStyle: { fontWeight: '700' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="item/[id]" options={{ title: 'Item' }} />
          <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
        </Stack>
      </MenuSourceProvider>
    </SessionProvider>
  );
}
