import React from 'react';
import { View, ViewProps, StyleSheet, Pressable } from 'react-native';
import { Colors, Radius, Shadow, Spacing } from '@/theme';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'primary' | 'secondary';
  padding?: keyof typeof Spacing | number;
  onPress?: () => void;
  glow?: boolean;
}

export function Card({
  variant = 'default',
  padding = 'lg',
  onPress,
  glow,
  style,
  children,
  ...rest
}: CardProps) {
  const content = (
    <View
      {...rest}
      style={[
        styles.base,
        styles[variant],
        {
          padding:
            typeof padding === 'number' ? padding : Spacing[padding],
        },
        glow && styles.glow,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  default: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  elevated: {
    backgroundColor: Colors.cardElevated,
    ...Shadow.md,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.secondary,
  },
  glow: Shadow.glow,
});
