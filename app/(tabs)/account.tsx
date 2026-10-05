import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../../src/auth/SessionProvider';
import { colors } from '../../src/theme';

export default function AccountScreen() {
  const { session, profile, isAdmin, isLoading, signOut } = useSession();
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator accessibilityLabel="Loading account" color={colors.accent} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Sign in to view your account.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          onPress={() => router.push('/sign-in')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  const onSignOut = async () => {
    setBusy(true);
    setError('');
    try {
      await signOut();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{session.user.email ?? profile?.name ?? 'Account'}</Text>
      {isAdmin && (
        <Text accessibilityLabel="Admin account label" style={styles.adminLabel}>
          Admin
        </Text>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        disabled={busy}
        onPress={() => void onSignOut()}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{busy ? 'Signing out…' : 'Sign out'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    flex: 1,
    justifyContent: 'center',
  },
  adminLabel: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: {
    color: colors.surface,
    fontWeight: '700',
  },
  error: {
    color: colors.soldOut,
    marginTop: 12,
  },
  text: {
    color: colors.textMuted,
    fontSize: 16,
  },
});
