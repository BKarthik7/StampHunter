import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, Vibration } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/theme';

interface StampPunchProps {
  isAnimating: boolean;
  onComplete?: () => void;
  children: React.ReactNode; // the StampFrame to animate
}

/**
 * StampPunch — wraps a StampFrame and plays the mechanical punch animation
 * when isAnimating becomes true.
 *
 * Sequence (total ~1.2s):
 * 0–300ms   Arm descend (y: -200 → 20, easeIn)
 * 300–380ms Impact shake (x: 0 → ±4px oscillation)
 * 380–600ms Perf border draw-in + postmark flash (handled via opacity on overlay)
 * 600–900ms Arm retract (y: 20 → -200, easeOut)
 * 900–1200ms Stamp scale settle (1.05 → 1.0)
 */
export function StampPunch({ isAnimating, onComplete, children }: StampPunchProps) {
  // Arm animation values
  const armY = useSharedValue(-220);
  const armOpacity = useSharedValue(0);

  // Stamp frame shake / scale
  const shakeX = useSharedValue(0);
  const stampScale = useSharedValue(1);

  // Postmark overlay (red ink flash)
  const postmarkOpacity = useSharedValue(0);

  const fireHaptic = useCallback(() => {
    Vibration.vibrate(40);
  }, []);

  const handleComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    if (!isAnimating) {
      // Reset to initial state
      armY.value = -220;
      armOpacity.value = 0;
      shakeX.value = 0;
      stampScale.value = 1;
      postmarkOpacity.value = 0;
      return;
    }

    // ── Start the sequence ──────────────────────────────────────

    // Show arm
    armOpacity.value = withTiming(1, { duration: 50 });

    // 1. Arm descend (0–300ms)
    armY.value = withTiming(20, {
      duration: 300,
      easing: Easing.in(Easing.quad),
    }, () => {
      // 2. Impact haptic (300ms)
      runOnJS(fireHaptic)();

      // 3. Screen shake (300–380ms)
      shakeX.value = withSequence(
        withTiming(-4, { duration: 16 }),
        withTiming(4, { duration: 16 }),
        withTiming(-3, { duration: 16 }),
        withTiming(3, { duration: 16 }),
        withTiming(-1, { duration: 8 }),
        withTiming(0, { duration: 8 }),
      );

      // 4. Postmark red flash (380–680ms)
      postmarkOpacity.value = withDelay(80,
        withSequence(
          withTiming(0.55, { duration: 120 }),
          withTiming(0, { duration: 280 }),
        )
      );

      // 5. Stamp scale (impact → settle), 380ms–1200ms
      stampScale.value = withDelay(80,
        withSpring(1.05, { damping: 12, stiffness: 200 }, () => {
          stampScale.value = withSpring(1.0, { damping: 18, stiffness: 120 });
        })
      );

      // 6. Arm retract (600–900ms)
      armY.value = withDelay(300,
        withTiming(-220, {
          duration: 300,
          easing: Easing.out(Easing.quad),
        }, () => {
          // 7. Hide arm, call complete (1200ms)
          armOpacity.value = withTiming(0, { duration: 100 });
          runOnJS(handleComplete)();
        })
      );
    });
  }, [isAnimating]);

  const armStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: armY.value }],
    opacity: armOpacity.value,
  }));

  const stampStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { scale: stampScale.value },
    ],
  }));

  const postmarkStyle = useAnimatedStyle(() => ({
    opacity: postmarkOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Mechanical stamp arm — enters from top */}
      <Animated.View style={[styles.arm, armStyle]}>
        <View style={styles.armShaft} />
        <View style={styles.armHead} />
      </Animated.View>

      {/* Stamp frame with shake + scale animations */}
      <Animated.View style={stampStyle}>
        {children}

        {/* Red postmark flash overlay */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.postmarkOverlay, postmarkStyle]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Stamp arm visuals
  arm: {
    position: 'absolute',
    alignItems: 'center',
    top: -40,
    zIndex: 10,
  },
  armShaft: {
    width: 20,
    height: 80,
    backgroundColor: Colors.ink,
    borderRadius: 4,
  },
  armHead: {
    width: 80,
    height: 20,
    backgroundColor: Colors.ink,
    borderRadius: 3,
    marginTop: 2,
  },
  postmarkOverlay: {
    backgroundColor: Colors.stampRed,
    borderRadius: 2,
    zIndex: 5,
  },
});
