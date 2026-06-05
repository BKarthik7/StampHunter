import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useUser, useAuth } from '@clerk/expo';
import { Colors, Spacing } from '../../constants/theme';

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.username}>@{user?.username ?? 'you'}</Text>
      <Text style={styles.email}>{user?.primaryEmailAddress?.emailAddress}</Text>
      <TouchableOpacity style={styles.signOutBtn} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  username: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: Colors.ink, marginBottom: 8 },
  email: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.muted, marginBottom: 40 },
  signOutBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 24, paddingVertical: 10 },
  signOutText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.ink },
});
