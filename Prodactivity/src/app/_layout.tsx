import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { G, Path } from 'react-native-svg';

import { AuthProvider } from '@/design/auth';
import { OnboardingProvider, useOnboarding } from '@/design/onboarding';
import { ThemeProvider, useTheme } from '@/design/theme';
import { DISPLAY_FONT } from '@/design/tokens';
import { StoreProvider, useStore } from '@/design/store';
import { SocialProvider } from '@/design/social';

function StreakrLogo({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 698.02 698.02">
      <G transform="translate(131.35,69.80)">
        <G
          transform="translate(-272.604075,768.695794) scale(0.100000,-0.100000)"
          fill="#e5e5e5"
          stroke="none">
          <Path d="M4840 7642 c-47 -210 -209 -580 -373 -853 -35 -58 -165 -258 -289 -445 -265 -398 -353 -543 -460 -754 -158 -314 -265 -632 -317 -945 -28 -174 -33 -228 -40 -450 l-6 -200 -53 53 c-222 222 -436 803 -488 1322 l-8 75 -17 -90 c-43 -218 -63 -458 -63 -755 0 -374 22 -574 100 -883 84 -335 238 -653 429 -887 58 -70 213 -226 285 -286 141 -117 401 -264 593 -335 148 -55 355 -115 364 -105 2 2 -28 68 -66 147 -212 443 -342 916 -403 1469 -16 148 -16 650 0 795 50 438 128 711 322 1123 157 335 354 642 541 846 l64 69 13 -44 c18 -63 49 -264 62 -399 21 -243 7 -580 -35 -825 -37 -218 -127 -515 -206 -684 -21 -46 -37 -86 -35 -88 11 -11 202 310 298 500 224 448 311 838 280 1261 -31 429 -154 825 -400 1286 -82 154 -77 150 -92 82z" />
          <Path d="M5833 6750 c15 -63 58 -314 68 -395 17 -133 14 -420 -5 -546 -73 -473 -275 -917 -672 -1474 -192 -269 -321 -498 -412 -728 -190 -483 -229 -983 -110 -1410 l23 -82 6 225 c7 238 24 373 74 566 110 423 369 821 664 1023 114 77 172 106 282 137 79 23 105 26 193 22 88 -4 112 -9 167 -35 227 -107 338 -382 285 -703 -41 -240 -186 -543 -350 -730 -145 -165 -393 -364 -599 -479 -32 -18 -56 -35 -54 -37 2 -3 51 5 108 16 623 128 1060 443 1323 955 193 375 287 910 245 1390 -5 66 -12 121 -13 122 -2 2 -28 -12 -60 -31 -31 -18 -72 -37 -91 -40 -147 -28 -283 142 -402 504 -19 58 -68 240 -110 405 -104 418 -190 667 -327 948 -62 126 -199 364 -223 387 -14 14 -15 13 -10 -10z" />
        </G>
      </G>
    </Svg>
  );
}

function AppSplash({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(onDone);
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity, zIndex: 100 }]}>
      <LinearGradient
        colors={theme.wallpaper}
        locations={theme.wallpaperLocations}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <StreakrLogo size={42} />
          <Text
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: 34,
              letterSpacing: -0.5,
              color: theme.textStrong,
            }}>
            Streakr
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function Navigator() {
  const { ready } = useStore();
  const { ready: onbReady, onboarded } = useOnboarding();
  if (!ready || !onbReady) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>

      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="habit/[id]" />
        <Stack.Screen name="create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="import" options={{ presentation: 'modal' }} />
        <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
        <Stack.Screen name="friends" options={{ presentation: 'modal' }} />
      </Stack.Protected>

      {/* Reachable from both onboarding and the app, so it stays outside the gate. */}
      <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <>
      <StatusBar style="auto" />
      <Navigator />
      {!splashDone && <AppSplash onDone={() => setSplashDone(true)} />}
    </>
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
              <OnboardingProvider>
                <App />
              </OnboardingProvider>
            </SocialProvider>
          </StoreProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
