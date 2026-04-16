import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { Colors, Typography } from '@/theme';

type Variant =
  | 'hero'
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodyMedium'
  | 'caption'
  | 'label'
  | 'metric'
  | 'metricLarge';

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  weight?: keyof typeof Typography.weight;
  uppercase?: boolean;
  tracking?: keyof typeof Typography.letterSpacing;
}

const variantStyles: Record<Variant, any> = {
  hero: {
    fontSize: Typography.size.hero,
    fontFamily: Typography.fontFamily.display,
    fontWeight: '800',
    lineHeight: Typography.size.hero * 1.05,
    letterSpacing: -1,
  },
  display: {
    fontSize: Typography.size.display,
    fontFamily: Typography.fontFamily.display,
    fontWeight: '800',
    lineHeight: Typography.size.display * 1.1,
    letterSpacing: -1,
  },
  h1: {
    fontSize: Typography.size.xxxl,
    fontFamily: Typography.fontFamily.display,
    fontWeight: '700',
    lineHeight: Typography.size.xxxl * 1.15,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: Typography.size.xxl,
    fontFamily: Typography.fontFamily.display,
    fontWeight: '700',
    lineHeight: Typography.size.xxl * 1.2,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: Typography.size.xl,
    fontFamily: Typography.fontFamily.semibold,
    fontWeight: '600',
    lineHeight: Typography.size.xl * 1.3,
  },
  body: {
    fontSize: Typography.size.base,
    fontFamily: Typography.fontFamily.regular,
    fontWeight: '400',
    lineHeight: Typography.size.base * 1.5,
  },
  bodyMedium: {
    fontSize: Typography.size.base,
    fontFamily: Typography.fontFamily.medium,
    fontWeight: '500',
    lineHeight: Typography.size.base * 1.5,
  },
  caption: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.fontFamily.regular,
    fontWeight: '400',
    lineHeight: Typography.size.sm * 1.4,
  },
  label: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.fontFamily.semibold,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  metric: {
    fontSize: Typography.size.xxl,
    fontFamily: Typography.fontFamily.display,
    fontWeight: '700',
    lineHeight: Typography.size.xxl * 1.1,
    letterSpacing: -0.5,
  },
  metricLarge: {
    fontSize: Typography.size.hero,
    fontFamily: Typography.fontFamily.display,
    fontWeight: '800',
    lineHeight: Typography.size.hero * 1.05,
    letterSpacing: -2,
  },
};

export function Text({
  variant = 'body',
  color,
  weight,
  uppercase,
  tracking,
  style,
  ...rest
}: Props) {
  return (
    <RNText
      {...rest}
      style={[
        styles.base,
        variantStyles[variant],
        { color: color ?? Colors.textPrimary },
        weight ? { fontWeight: Typography.weight[weight] } : null,
        uppercase ? styles.upper : null,
        tracking ? { letterSpacing: Typography.letterSpacing[tracking] } : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: Colors.textPrimary,
  },
  upper: {
    textTransform: 'uppercase',
  },
});
