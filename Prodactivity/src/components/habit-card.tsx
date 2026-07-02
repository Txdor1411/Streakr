import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, Easing } from 'react-native-reanimated';

import { Glass } from '@/components/glass';
import { CheckIcon } from '@/components/icons';
import { ProgressRing } from '@/components/progress-ring';
import { Body, Display } from '@/components/text';
import { useTheme } from '@/design/theme';
import type { HabitView } from '@/design/store';
import { tint } from '@/design/tokens';

/** Circular log button with done / count-ring / empty states. */
export function LogButton({
  habit,
  onPress,
  size = 50,
}: {
  habit: HabitView;
  onPress: () => void;
  size?: number;
}) {
  const theme = useTheme();
  const isCount = habit.type === 'count';
  const done = habit.done || (isCount && habit.value >= habit.goal);
  const prevDone = useRef(done);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (done && !prevDone.current) {
      scale.value = withSequence(
        withTiming(1.08, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
      );
    }
    prevDone.current = done;
  }, [done]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  let inner;
  if (done) {
    inner = (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: habit.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <CheckIcon size={size * 0.4} />
      </View>
    );
  } else if (isCount) {
    inner = (
      <ProgressRing size={size} stroke={4} progress={habit.value / habit.goal} color={habit.accent}>
        <View
          style={{
            width: size - 8,
            height: size - 8,
            borderRadius: (size - 8) / 2,
            backgroundColor: theme.scheme === 'dark' ? '#181822' : '#fff',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Display size={15} weight="700" color={habit.accent}>
            {String(habit.value)}
          </Display>
        </View>
      </ProgressRing>
    );
  } else {
    inner = (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.scheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff',
        }}
      />
    );
  }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withTiming(0.93, { duration: 80, easing: Easing.out(Easing.quad) }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }); }}
        hitSlop={6}>
        {inner}
      </Pressable>
    </Animated.View>
  );
}

/** A habit row used on the Today screen. */
export function HabitCard({
  habit,
  subtitle,
  onLog,
}: {
  habit: HabitView;
  subtitle: string;
  onLog: () => void;
}) {
  const theme = useTheme();
  return (
    <Glass radius={20} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: tint(habit.accent, theme.scheme === 'dark' ? '33' : '22'),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Body size={21}>{habit.emoji}</Body>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Display size={15} weight="600" lineHeight={17}>
          {habit.name}
        </Display>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <Body size={11}>🔥</Body>
          <Body size={12} weight="600" color={theme.scheme === 'dark' ? '#b0b0bb' : '#6a6a73'}>
            {String(habit.streak)}
          </Body>
          <Body size={12} secondary>
            · {subtitle}
          </Body>
        </View>
      </View>
      <LogButton habit={habit} onPress={onLog} />
    </Glass>
  );
}
