import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Explore — coming soon</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper, alignItems: 'center', justifyContent: 'center' },
  placeholder: { fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.muted },
});
