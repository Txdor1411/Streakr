import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming, Easing } from 'react-native-reanimated';

import { Confetti } from '@/components/confetti';
import { Glass } from '@/components/glass';
import { PlusIcon } from '@/components/icons';
import { HabitCard } from '@/components/habit-card';
import { Screen } from '@/components/screen';
import { Body, Display } from '@/components/text';
import { dateKey, useStore, type HabitView } from '@/design/store';
import { useTheme } from '@/design/theme';
import { Palette, tint } from '@/design/tokens';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function weekdayMon0(d: Date) {
  return (d.getDay() + 6) % 7;
}

function subFor(h: HabitView) {
  if (h.type === 'count') return `${h.value} of ${h.goal} ${h.sub}`;
  if (h.type === 'timer') return `${h.goal} ${h.sub}`;
  return h.sub;
}

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function AnimatedCard({ index, children }: { index: number; children: ReactNode }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(14);
  useEffect(() => {
    const ease = Easing.out(Easing.quad);
    opacity.value = withDelay(index * 50, withTiming(1, { duration: 280, easing: ease }));
    translateY.value = withDelay(index * 50, withTiming(0, { duration: 280, easing: ease }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, habitsForDay, logHabit } = useStore();

  const firstName = profile.name.trim().split(/\s+/)[0] || 'there';
  const avatarScale = useSharedValue(1);
  const avatarStyle = useAnimatedStyle(() => ({ transform: [{ scale: avatarScale.value }] }));
  const fabScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));
  const now = new Date();
  const todayIdx = weekdayMon0(now);

  // This week's strip (Mon→Sun), with a "perfect day" dot.
  const monday = new Date(now);
  monday.setDate(now.getDate() - todayIdx);
  const week = WEEKDAY_LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dayHabits = habitsForDay(dateKey(d)).filter((h) => h.days[i]);
    const done = dayHabits.length > 0 && dayHabits.every((h) => h.done);
    return { d: label, n: d.getDate(), done, today: i === todayIdx };
  });

  // Today's scheduled habits.
  const allHabits = habitsForDay();
  const habits = allHabits.filter((h) => h.days[todayIdx]);
  const completed = habits.filter((h) => h.done).length;
  const total = habits.length;
  const allDone = total > 0 && completed === total;

  // Overall streak = consecutive days where every scheduled habit was done.
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dh = habitsForDay(dateKey(d)).filter((h) => h.days[weekdayMon0(d)]);
    if (dh.length > 0 && dh.every((h) => h.done)) streak++;
    else if (i !== 0) break;
  }

  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View>
            <Display size={26} weight="600" lineHeight={31}>
              {greeting(now.getHours())}, {firstName}!
            </Display>
            <Body size={13} weight="500" secondary style={{ marginTop: 7 }}>
              {dateLabel}
            </Body>
          </View>
          <Animated.View style={avatarStyle}>
            <Pressable
              onPress={() => router.push('/profile')}
              onPressIn={() => { avatarScale.value = withTiming(0.93, { duration: 80, easing: Easing.out(Easing.quad) }); }}
              onPressOut={() => { avatarScale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }); }}
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: theme.scheme === 'dark' ? '#4a3f5a' : '#FFCFA0',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Body size={24}>{profile.emoji}</Body>
            </Pressable>
          </Animated.View>
        </View>

        {/* Streak summary */}
        <Glass radius={18} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginTop: 15 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              backgroundColor: tint(Palette.coral, theme.scheme === 'dark' ? '33' : '24'),
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Body size={20}>🔥</Body>
          </View>
          <View style={{ flex: 1 }}>
            <Display size={15} weight="600">
              {streak === 0 ? 'Start your streak' : `${streak}-day streak`}
            </Display>
            <Body size={11.5} secondary style={{ marginTop: 4 }}>
              {streak === 0 ? 'Complete every habit today' : 'Keep the chain alive'}
            </Body>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Display size={17} weight="700" color={theme.accent}>
              {completed}/{total}
            </Display>
            <Body size={10.5} muted style={{ marginTop: 3 }}>
              {total - completed} left
            </Body>
          </View>
        </Glass>

        {/* Weekday strip */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}>
          {week.map((day) => (
            <View key={day.d} style={{ alignItems: 'center', gap: 6 }}>
              <Body size={10.5} weight={day.today ? '700' : '600'} color={day.today ? theme.accent : theme.textMuted}>
                {day.d}
              </Body>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: day.today ? Palette.coral : theme.fillStrong,
                }}>
                <Body size={14} weight={day.today ? '700' : '600'} color={day.today ? '#fff' : theme.textSecondary}>
                  {String(day.n)}
                </Body>
              </View>
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: day.done ? Palette.emerald : 'transparent',
                }}
              />
            </View>
          ))}
        </View>

        {/* Daily routine */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 11 }}>
          <Display size={17} weight="600">
            Daily routine
          </Display>
          <Pressable onPress={() => router.push('/habits')}>
            <Body size={12.5} weight="600" color={theme.accent}>
              See all
            </Body>
          </Pressable>
        </View>

        {habits.length === 0 ? (
          <Glass radius={20} style={{ padding: 22, alignItems: 'center', gap: 6 }}>
            <Body size={26}>{allHabits.length === 0 ? '🌱' : '🌙'}</Body>
            <Display size={15} weight="600">
              {allHabits.length === 0 ? 'No habits yet' : 'Nothing scheduled today'}
            </Display>
            <Body size={12.5} secondary style={{ textAlign: 'center' }}>
              {allHabits.length === 0
                ? 'Tap + to add a habit and start tracking.'
                : `You have ${allHabits.length} habit${allHabits.length === 1 ? '' : 's'} — none scheduled for ${WEEKDAY_LABELS[todayIdx]}. See them under All habits.`}
            </Body>
          </Glass>
        ) : (
          <View style={{ gap: 10 }}>
            {habits.map((h, i) => (
              <AnimatedCard key={h.id} index={i}>
                <Pressable onPress={() => router.push(`/habit/${h.id}`)}>
                  <HabitCard habit={h} subtitle={subFor(h)} onLog={() => logHabit(h.id)} />
                </Pressable>
              </AnimatedCard>
            ))}
          </View>
        )}
      </Screen>

      {/* Floating add button */}
      <Animated.View style={[fabStyle, { position: 'absolute', right: 22, bottom: 102 }]}>
        <Pressable
          onPress={() => router.push('/create')}
          onPressIn={() => { fabScale.value = withTiming(0.92, { duration: 80, easing: Easing.out(Easing.quad) }); }}
          onPressOut={() => { fabScale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }); }}
          style={{
            width: 54,
            height: 54,
            borderRadius: 19,
            backgroundColor: Palette.coral,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: Palette.coral,
            shadowOpacity: 0.5,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 10 },
          }}>
          <PlusIcon />
        </Pressable>
      </Animated.View>

      {allDone && <Confetti />}
    </View>
  );
}
