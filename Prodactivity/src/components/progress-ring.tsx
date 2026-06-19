import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/design/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ProgressRingProps = {
  size: number;
  stroke: number;
  /** 0–1 */
  progress: number;
  color: string;
  trackColor?: string;
  children?: ReactNode;
};

/** Circular progress ring (rotated so 0% starts at the top). */
export function ProgressRing({ size, stroke, progress, color, trackColor, children }: ProgressRingProps) {
  const theme = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const track = trackColor ?? (theme.scheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(120,120,130,0.15)');
  const clamped = Math.max(0, Math.min(1, progress));

  const offset = useSharedValue(c * (1 - clamped));
  useEffect(() => {
    offset.value = withTiming(c * (1 - clamped), { duration: 500, easing: Easing.out(Easing.quad) });
  }, [clamped, c]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          animatedProps={animatedProps}
        />
      </Svg>
      {children != null && (
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      )}
    </View>
  );
}
