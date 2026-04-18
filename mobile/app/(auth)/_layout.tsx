import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '@/theme';
import { DevSkipButton } from '@/components/DevSkipButton';

export default function AuthLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="goal" />
        <Stack.Screen name="profile" />
      </Stack>
      <DevSkipButton />
    </View>
  );
}
