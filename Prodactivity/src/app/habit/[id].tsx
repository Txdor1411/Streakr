import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/glass';
import { Heatmap, HeatmapLegend } from '@/components/heatmap';
import { CheckIcon, ChevronLeft } from '@/components/icons';
import { StreakFlame } from '@/components/streak-flame';
import { Body, Display } from '@/components/text';
import { Wallpaper } from '@/components/wallpaper';
import { computeBestStreak, computeStreak, dateKey, todayKey, useStore, type HabitDef } from '@/design/store';
import { useTheme } from '@/design/theme';
import { Palette, tint } from '@/design/tokens';

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function weekdayMon0(d: Date) {
  return (d.getDay() + 6) % 7;
}

/** Completion amount → 0–4 heat level for a habit. */
function levelFor(habit: HabitDef, amount: number) {
  if (amount <= 0) return 0;
  if (habit.type === 'count') return Math.max(1, Math.min(4, Math.ceil((amount / habit.goal) * 4)));
  return 4;
}

export default function HabitDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { habits, logFor, logHabit, removeHabit, frozenDates, freezes, freezeDay } = useStore();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const habit = habits.find((h) => h.id === id);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/habits');
  };

  const onDelete = () => {
    if (!habit) return;
    setDeleting(true);
    removeHabit(habit.id);
    goBack();
  };

  if (!habit) {
    // Mid-delete: the habit is already gone but navigation hasn't settled —
    // render nothing instead of flashing the "not found" fallback.
    if (deleting) return <Wallpaper />;
    return (
      <Wallpaper>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Display size={18} weight="600">
            Habit not found
          </Display>
          <Pressable onPress={goBack} style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: theme.accent }}>
            <Body size={14} weight="600" color="#fff">
              Go back
            </Body>
          </Pressable>
        </View>
      </Wallpaper>
    );
  }

  const accent = habit.accent;
  const log = logFor(habit.id);
  const streak = computeStreak(habit, log, frozenDates);
  const best = computeBestStreak(habit, log, frozenDates);

  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  const ydKey = dateKey(yd);
  const canFreezeYesterday =
    freezes > 0 &&
    habit.days[weekdayMon0(yd)] &&
    !frozenDates.has(ydKey) &&
    (log[ydKey] ?? 0) < habit.goal;
  const today = todayKey();
  const doneToday = (log[today] ?? 0) >= habit.goal;

  // Last 364 days (oldest → newest) as heat levels.
  const now = new Date();
  const levels: number[] = [];
  let yearCompleted = 0;
  const weekdayHits = [0, 0, 0, 0, 0, 0, 0];
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  let totalLogged = 0;
  let countSum = 0;
  for (let i = 363; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const amount = log[dateKey(d)] ?? 0;
    levels.push(levelFor(habit, amount));
    const complete = amount >= habit.goal;
    const wd = weekdayMon0(d);
    if (habit.days[wd]) {
      weekdayTotals[wd]++;
      if (complete) weekdayHits[wd]++;
    }
    if (complete) yearCompleted++;
    if (amount > 0) {
      totalLogged++;
      countSum += amount;
    }
  }

  const scheduledTotal = weekdayTotals.reduce((a, b) => a + b, 0);
  const scheduledHits = weekdayHits.reduce((a, b) => a + b, 0);
  const completionPct = scheduledTotal > 0 ? Math.round((scheduledHits / scheduledTotal) * 100) : 0;

  let bestWeekday = '—';
  let bestRate = -1;
  WEEKDAY_NAMES.forEach((name, i) => {
    if (weekdayTotals[i] > 0) {
      const rate = weekdayHits[i] / weekdayTotals[i];
      if (rate > bestRate) {
        bestRate = rate;
        bestWeekday = name;
      }
    }
  });

  const perDayAvg = totalLogged > 0 ? (countSum / totalLogged).toFixed(1) : '0';

  const circleBtn = {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.glassBg,
    borderWidth: 1,
    borderColor: theme.glassBorder,
  };

  return (
    <Wallpaper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 96 }}>
        {/* Top bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
          <Pressable onPress={() => router.back()} style={circleBtn}>
            <ChevronLeft color={theme.scheme === 'dark' ? '#c8c8d0' : '#56565f'} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Body size={19}>{habit.emoji}</Body>
            <Display size={18} weight="600">
              {habit.name}
            </Display>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* Streak hero */}
        <Glass radius={24} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 13, padding: 16, marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
            <StreakFlame size={62} glyph={34} color={accent} />
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                <Display size={38} weight="600" lineHeight={34}>
                  {streak}
                </Display>
                <Body size={14} weight="600" secondary>
                  {streak === 1 ? 'day' : 'days'}
                </Body>
              </View>
              <Body size={12.5} secondary style={{ marginTop: 3 }}>
                Current streak · 🥇 best {best}
              </Body>
            </View>
          </View>
          {canFreezeYesterday && (
            <Pressable
              onPress={() => freezeDay(ydKey)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 12,
                backgroundColor: tint(accent, theme.scheme === 'dark' ? '33' : '22'),
              }}>
              <Body size={13}>🧊</Body>
              <Body size={12} weight="700" color={theme.scheme === 'dark' ? '#fff' : accent}>
                Protect
              </Body>
            </Pressable>
          )}
        </Glass>

        {/* Year heatmap */}
        <Glass radius={24} style={{ padding: 16, marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <Display size={16} weight="600">
              This year
            </Display>
            <Body size={12.5} secondary>
              <Body size={12.5} weight="700" color={theme.scheme === 'dark' ? Palette.emeraldLight : accent}>
                {yearCompleted}
              </Body>{' '}
              days completed
            </Body>
          </View>

          <View style={{ flexDirection: 'row', gap: 5 }}>
            <View style={{ justifyContent: 'space-between', height: 41, paddingVertical: 1 }}>
              <Body size={7.5} muted>Mon</Body>
              <Body size={7.5} muted>Wed</Body>
              <Body size={7.5} muted>Fri</Body>
            </View>
            <View style={{ flex: 1 }}>
              <Heatmap levels={levels} accent={accent} flow="column" rows={7} gap={1.5} radius={1.5} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 11 }}>
            <Body size={9.5} muted>
              Less
            </Body>
            <HeatmapLegend accent={accent} />
            <Body size={9.5} muted>
              More
            </Body>
          </View>
        </Glass>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          {[
            { v: `${completionPct}%`, label: 'Completion', color: theme.scheme === 'dark' ? Palette.emeraldLight : accent },
            { v: bestWeekday, label: 'Best weekday' },
            { v: habit.type === 'count' ? `${perDayAvg}×` : `${scheduledHits}`, label: habit.type === 'count' ? 'Per day avg' : 'Total done' },
          ].map((s) => (
            <Glass key={s.label} radius={20} style={{ flex: 1, padding: 13 }}>
              <Display size={24} weight="600" color={s.color}>
                {s.v}
              </Display>
              <Body size={11.5} secondary style={{ marginTop: 4 }}>
                {s.label}
              </Body>
            </Glass>
          ))}
        </View>

        {/* Delete */}
        {confirming ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            <Body size={12.5} secondary style={{ textAlign: 'center', marginBottom: 2 }}>
              Delete “{habit.name}”? This erases its history and can&apos;t be undone.
            </Body>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setConfirming(false)}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.glassBg,
                  borderWidth: 1,
                  borderColor: theme.glassBorder,
                }}>
                <Body size={14.5} weight="600" color={theme.textSecondary}>
                  Cancel
                </Body>
              </Pressable>
              <Pressable
                onPress={onDelete}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: Palette.run,
                }}>
                <Body size={14.5} weight="700" color="#fff">
                  Delete forever
                </Body>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setConfirming(true)}
            style={{
              marginTop: 12,
              height: 50,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.glassBg,
              borderWidth: 1,
              borderColor: theme.glassBorder,
            }}>
            <Body size={14.5} weight="600" color={Palette.run}>
              Delete habit
            </Body>
          </Pressable>
        )}
      </ScrollView>

      {/* Log today */}
      <Pressable
        onPress={() => logHabit(habit.id)}
        style={{
          position: 'absolute',
          left: 18,
          right: 18,
          bottom: insets.bottom + 16,
          height: 54,
          borderRadius: 20,
          backgroundColor: doneToday ? theme.fillStrong : accent,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          shadowColor: accent,
          shadowOpacity: doneToday ? 0 : 0.5,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
        }}>
        <CheckIcon size={20} color={doneToday ? theme.textSecondary : '#fff'} />
        <Display size={16} weight="600" color={doneToday ? theme.textSecondary : '#fff'}>
          {doneToday ? 'Completed today' : habit.type === 'count' ? 'Add one' : 'Log today'}
        </Display>
      </Pressable>
    </Wallpaper>
  );
}
