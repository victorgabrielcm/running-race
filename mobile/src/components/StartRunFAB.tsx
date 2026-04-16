import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Colors, Shadow } from '@/theme';
import { Text } from './ui/Text';

interface Props {
  bottomOffset?: number;
}

export function StartRunFAB({ bottomOffset = 100 }: Props) {
  const router = useRouter();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/run');
  };

  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(600)}
      style={[styles.container, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.fab,
          pressed && { transform: [{ scale: 0.96 }] },
        ]}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.content}>
          <Ionicons name="play" size={18} color={Colors.textInverse} />
          <Text
            variant="label"
            color={Colors.textInverse}
            tracking="widest"
            weight="bold"
          >
            CORRER
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  fab: {
    width: 140,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Shadow.glow,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
