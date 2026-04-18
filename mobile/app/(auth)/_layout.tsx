import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      <SafeAreaView pointerEvents="box-none" style={{ position: 'absolute', top: 0, right: 0 }}>
        <DevSkipButton />
      </SafeAreaView>
    </View>
  );
}
