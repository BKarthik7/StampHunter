import { View, Text, StyleSheet } from 'react-native';
import { useAuth, useUser } from '@clerk/expo';
import { Colors, Typography, Spacing } from '../../constants/theme';

export default function HomeScreen() {
  const { user } = useUser();

  return (
    <View style={styles.container}>
      {/* Empty state — replaced by StampGrid once stamps are loaded */}
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Your archive awaits.</Text>
        <Text style={styles.emptyBody}>
          Tap the{' '}
          <Text style={{ color: Colors.stampRed, fontFamily: 'Inter_600SemiBold' }}>+</Text>
          {' '}button below to stamp your first memory.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 26,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  emptyBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
