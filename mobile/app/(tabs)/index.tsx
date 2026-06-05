import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { StampGrid } from '../../components/stamp/StampGrid';
import { Colors, Typography, Spacing } from '../../constants/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>My Collection</Text>
        <TouchableOpacity
          style={styles.stampBtn}
          onPress={() => router.push('/(tabs)/camera')}
          activeOpacity={0.8}
        >
          <Text style={styles.stampBtnText}>+ Stamp</Text>
        </TouchableOpacity>
      </View>

      {/* Real stamp grid — cursor-paginated, pull-to-refresh */}
      <StampGrid />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.paper,
  },
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop:      Spacing.lg,
    paddingBottom:   Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor:   Colors.paper,
  },
  heading: {
    fontFamily: Typography.serifSemiBold,
    fontSize:   Typography.sectionHeading,
    color:      Colors.ink,
  },
  stampBtn: {
    backgroundColor: Colors.stampRed,
    paddingVertical:   8,
    paddingHorizontal: 16,
    borderRadius:      6,
  },
  stampBtnText: {
    fontFamily: Typography.sansSemiBold,
    fontSize:   13,
    color:      Colors.white,
  },
});
