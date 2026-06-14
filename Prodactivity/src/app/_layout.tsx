import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '@/design/auth';
import { ThemeProvider } from '@/design/theme';
import { StoreProvider, useStore } from '@/design/store';
import { SocialProvider } from '@/design/social';

function Navigator() {
  const { ready } = useStore();
  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="habit/[id]" />
      <Stack.Screen name="create" options={{ presentation: 'modal' }} />
      <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
      <Stack.Screen name="import" options={{ presentation: 'modal' }} />
      <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
      <Stack.Screen name="friends" options={{ presentation: 'modal' }} />
      <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Batica: require('@/assets/fonts/BaticaSans-Regular.otf'),
  });

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <StoreProvider>
            <SocialProvider>
              <StatusBar style="auto" />
              <Navigator />
            </SocialProvider>
          </StoreProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
