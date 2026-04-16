import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Colors, Spacing, BRAND } from '@/theme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useStravaAuthRequest, exchangeStravaCode } from '@/services/strava';
import { useAuthStore } from '@/stores/authStore';

const { height } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const { request, response, promptAsync, redirectUri } = useStravaAuthRequest();
  const setTokens = useAuthStore((s) => s.setTokens);

  useEffect(() => {
    const handle = async () => {
      if (response?.type === 'success' && response.params.code) {
        try {
          const tokens = await exchangeStravaCode(response.params.code, redirectUri);
          await setTokens(tokens);
          router.replace('/(auth)/goal');
        } catch (err) {
          console.error('[strava] exchange failed', err);
        }
      }
    };
    handle();
  }, [response, redirectUri, router, setTokens]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.background, '#1A1A0A', Colors.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative grid pattern */}
      <View style={styles.gridOverlay} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <View style={styles.logoCircle}>
              <View style={styles.logoInner}>
                <Text variant="display" color={Colors.primary}>V</Text>
              </View>
            </View>
            <Text
              variant="hero"
              color={Colors.primary}
              style={styles.brand}
              tracking="wider"
            >
              {BRAND.name}
            </Text>
            <Text
              variant="caption"
              color={Colors.textSecondary}
              uppercase
              tracking="widest"
              style={styles.version}
            >
              {BRAND.version} · Beta
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(700).delay(200)}
            style={styles.center}
          >
            <Text variant="display" style={styles.headline}>
              Cada quilômetro{'\n'}é uma{' '}
              <Text variant="display" color={Colors.primary}>conquista.</Text>
            </Text>
            <Text variant="body" color={Colors.textSecondary} style={styles.sub}>
              Coaching de corrida com IA, conectado ao seu Strava.
              Plano que evolui a cada treino.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(700).delay(400)} style={styles.footer}>
            <View style={styles.features}>
              <Feature icon="flash" label="PLANO AI" />
              <Feature icon="pulse" label="STRAVA SYNC" />
              <Feature icon="restaurant" label="NUTRIÇÃO" />
              <Feature icon="trophy" label="METAS REAIS" />
            </View>

            <Button
              label="Conectar com Strava"
              variant="primary"
              size="lg"
              fullWidth
              disabled={!request}
              onPress={() => promptAsync()}
              leftIcon={<Ionicons name="logo-strava" size={18} color={Colors.textInverse} />}
            />

            <View style={styles.howItWorks}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.primary} />
              <Text variant="caption" color={Colors.textSecondary} style={{ flex: 1 }}>
                Seguro. Abrimos o Strava pra você autorizar — nada de senha no Vincere.
              </Text>
            </View>

            <Text
              variant="caption"
              color={Colors.textTertiary}
              style={styles.legal}
            >
              Ao continuar, você concorda com nossos Termos e Política de Privacidade.
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Feature({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <Text variant="label" color={Colors.textSecondary} tracking="wider">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.03,
  },
  safe: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  logoInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    letterSpacing: 4,
  },
  version: {
    marginTop: Spacing.sm,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headline: {
    textAlign: 'center',
    fontSize: 40,
    lineHeight: 44,
  },
  sub: {
    textAlign: 'center',
    marginTop: Spacing.base,
    maxWidth: 320,
    lineHeight: 22,
  },
  footer: {
    gap: Spacing.lg,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  feature: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legal: {
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  howItWorks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
});
