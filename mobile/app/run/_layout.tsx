import { Stack } from 'expo-router';
import { Colors } from '@/theme';

export default function RunLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="active" options={{ gestureEnabled: false }} />
      <Stack.Screen name="summary" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
