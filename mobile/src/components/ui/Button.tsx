import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  View,
  GestureResponderEvent,
  PressableProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Spacing, Typography } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'outlined' | 'ghost' | 'inverted';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  haptic?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  leftIcon,
  rightIcon,
  haptic = true,
  disabled,
  onPress,
  ...rest
}: ButtonProps) {
  const handle = (e: GestureResponderEvent) => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(e);
  };

  const textColor =
    variant === 'primary' || variant === 'inverted'
      ? Colors.textInverse
      : variant === 'secondary'
        ? Colors.textPrimary
        : Colors.primary;

  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      onPress={handle}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
          <Text
            color={textColor}
            weight="bold"
            uppercase
            tracking="wider"
            style={{ fontSize: size === 'lg' ? 15 : size === 'sm' ? 11 : 13 }}
          >
            {label}
          </Text>
          {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // variants
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.secondary },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  ghost: { backgroundColor: 'transparent' },
  inverted: { backgroundColor: Colors.textPrimary },
  // sizes
  sm: { paddingVertical: 10, paddingHorizontal: Spacing.base },
  md: { paddingVertical: 14, paddingHorizontal: Spacing.xl },
  lg: { paddingVertical: 18, paddingHorizontal: Spacing.xxl },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
