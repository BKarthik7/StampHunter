import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

export default function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Notifications — coming soon</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper, alignItems: 'center', justifyContent: 'center' },
  placeholder: { fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.muted },
});
