import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Radius } from '@/theme';

interface Props {
  value: number; // 0-1
  color?: string;
  trackColor?: string;
  height?: number;
  animated?: boolean;
}

export function ProgressBar({
  value,
  color = Colors.primary,
  trackColor = Colors.border,
  height = 6,
  animated = true,
}: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      progress.value = withTiming(Math.max(0, Math.min(1, value)), {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = Math.max(0, Math.min(1, value));
    }
  }, [value, animated, progress]);

  const style = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: trackColor, height, borderRadius: height / 2 },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: color, borderRadius: height / 2 },
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
