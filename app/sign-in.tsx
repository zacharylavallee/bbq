import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSession } from '../src/auth/SessionProvider';
import { colors } from '../src/theme';

export default function SignInScreen() {
  const { session, isLoading, signIn } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Loading sign-in" color={colors.accent} />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/account" />;
  }

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const message = await signIn(email.trim(), password);
      if (message) {
        setError(message);
      } else {
        router.replace('/account');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <TextInput
        accessibilityLabel="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        style={styles.input}
        value={email}
      />
      <TextInput
        accessibilityLabel="Password"
        autoCapitalize="none"
        autoComplete="password"
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Submit sign in"
        disabled={busy}
        onPress={() => void submit()}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{busy ? 'Signing in…' : 'Sign in'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 8,
    marginTop: 8,
    padding: 14,
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
  },
  container: {
    backgroundColor: colors.paper,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
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
    marginBottom: 12,
    padding: 12,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
  },
});
