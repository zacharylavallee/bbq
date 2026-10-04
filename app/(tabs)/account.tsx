import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../src/theme';

export default function AccountScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Sign in coming soon.</Text>
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
  text: {
    color: colors.textMuted,
    fontSize: 16,
  },
});
