import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import { Colors, Spacing, Radius } from '@/theme';
import { Text } from '@/components/ui/Text';
import { sendCoachMessage } from '@/services/coach';
import type { CoachMessage } from '@/types';
import { mockCoachMessages } from '@/mock/data';

const quickActions = [
  { label: 'Analisar último treino', icon: 'analytics' as const },
  { label: 'Ajustar plano da semana', icon: 'sparkles' as const },
  { label: 'Que pasta comer hoje?', icon: 'restaurant' as const },
  { label: 'Por que meu pace caiu?', icon: 'trending-down' as const },
  { label: 'Hidratação no longão', icon: 'water' as const },
];

export default function CoachScreen() {
  const [messages, setMessages] = useState<CoachMessage[]>(mockCoachMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [coachOnline, setCoachOnline] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const send = async (text?: string) => {
    const content = text ?? input.trim();
    if (!content) return;

    const userMsg: CoachMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const reply = await sendCoachMessage(content, messages);
      setMessages((prev) => [...prev, reply]);
    } catch {
      setCoachOnline(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content:
            'Ops, não consegui conectar agora. Pode ser instabilidade momentânea — tente de novo em instantes. Se o problema continuar, verifique sua conexão com a internet.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.aiCircle}>
            <Ionicons name="sparkles" size={18} color={Colors.primary} />
          </View>
          <View>
            <Text variant="label" color={Colors.primary} tracking="wider">
              COACH IA
            </Text>
            <Text variant="h3" color={Colors.textPrimary}>
              Vincere Coach
            </Text>
          </View>
        </View>
        <View style={[styles.onlineBadge, !coachOnline && styles.offlineBadge]}>
          <View style={[styles.onlineDot, !coachOnline && { backgroundColor: Colors.secondary }]} />
          <Text variant="label" color={coachOnline ? Colors.primary : Colors.secondary} tracking="wider">
            {coachOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.chat}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m) => (
            <Animated.View
              key={m.id}
              entering={m.role === 'user' ? FadeInUp.duration(250) : FadeInDown.duration(300)}
              style={[
                styles.bubble,
                m.role === 'user' ? styles.bubbleUser : styles.bubbleAi,
              ]}
            >
              {m.role === 'assistant' ? (
                <View style={styles.aiHeader}>
                  <View style={styles.aiDot}>
                    <Ionicons name="sparkles" size={10} color={Colors.textInverse} />
                  </View>
                  <Text variant="label" color={Colors.primary} tracking="wider">
                    COACH
                  </Text>
                </View>
              ) : null}
              <Text
                variant="body"
                color={m.role === 'user' ? Colors.textInverse : Colors.textPrimary}
                style={{ lineHeight: 22 }}
              >
                {m.content}
              </Text>
            </Animated.View>
          ))}

          {sending ? (
            <View style={[styles.bubble, styles.bubbleAi]}>
              <View style={styles.typing}>
                <View style={[styles.typingDot, { opacity: 0.4 }]} />
                <View style={[styles.typingDot, { opacity: 0.7 }]} />
                <View style={[styles.typingDot, { opacity: 1 }]} />
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* Quick actions */}
        {messages.length <= 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickScroll}
            contentContainerStyle={styles.quickContainer}
          >
            {quickActions.map((a) => (
              <Pressable
                key={a.label}
                onPress={() => send(a.label)}
                style={styles.quickChip}
              >
                <Ionicons name={a.icon} size={14} color={Colors.primary} />
                <Text variant="caption" color={Colors.textPrimary} weight="medium">
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Pergunte sobre treino, nutrição, recuperação..."
            placeholderTextColor={Colors.textTertiary}
            style={styles.input}
            multiline
          />
          <Pressable
            onPress={() => send()}
            disabled={!input.trim() || sending}
            style={[
              styles.sendBtn,
              (!input.trim() || sending) && { opacity: 0.4 },
            ]}
          >
            <Ionicons name="arrow-up" size={18} color={Colors.textInverse} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  aiCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.primaryMuted,
    borderRadius: Radius.pill,
  },
  offlineBadge: {
    backgroundColor: Colors.secondary + '20',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  chat: {
    padding: Spacing.screen,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  bubble: {
    maxWidth: '86%',
    padding: Spacing.base,
    borderRadius: Radius.lg,
  },
  bubbleAi: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typing: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  quickScroll: {
    maxHeight: 52,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  quickContainer: {
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
