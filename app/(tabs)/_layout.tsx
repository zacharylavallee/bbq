import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSession } from '../../src/auth/SessionProvider';
import { colors } from '../../src/theme';

export default function TabsLayout() {
  const { isAdmin } = useSession();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.charcoal },
        headerTintColor: colors.paper,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size }) => <Ionicons name="fast-food" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? undefined : null,
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="construct" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
