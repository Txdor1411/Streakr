import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Glass } from '@/components/glass';
import { Heatmap, UNSCHEDULED_LEVEL } from '@/components/heatmap';
import { Screen } from '@/components/screen';
import { Body, Display } from '@/components/text';
import { computeStreak, dateKey, useStore, weekdayMon0, type HabitDef } from '@/design/store';
import { useTheme } from '@/design/theme';
import { tint } from '@/design/tokens';

const MOSAIC_DAYS = 180;

/** Build last-180-day heat levels + completion % for a habit. */
function summarize(habit: HabitDef, log: Record<string, number>) {
  const now = new Date();
  const levels: number[] = [];
  let hits = 0;
  let scheduled = 0;
  for (let i = MOSAIC_DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const isScheduled = habit.days[weekdayMon0(d)];
    const amount = log[dateKey(d)] ?? 0;
    if (!isScheduled) levels.push(UNSCHEDULED_LEVEL);
    else if (amount <= 0) levels.push(0);
    else if (habit.type === 'count') levels.push(Math.max(1, Math.min(4, Math.ceil((amount / habit.goal) * 4))));
    else levels.push(4);
    if (isScheduled) {
      scheduled++;
      if (amount >= habit.goal) hits++;
    }
  }
  const pct = scheduled > 0 ? Math.round((hits / scheduled) * 100) : 0;
  return { levels, pct };
}

export default function HabitsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { habits, logFor } = useStore();

  return (
    <Screen>
      <View>
        <Display size={25} weight="600">
          All habits
        </Display>
        <Body size={13} secondary style={{ marginTop: 6 }}>
          {habits.length} active · last 180 days
        </Body>
      </View>

      {habits.length === 0 ? (
        <Glass radius={20} style={{ padding: 24, alignItems: 'center', gap: 6, marginTop: 16 }}>
          <Body size={26}>🌱</Body>
          <Display size={15} weight="600">
            No habits yet
          </Display>
          <Body size={12.5} secondary style={{ textAlign: 'center' }}>
            Add one from the Today tab to start building streaks.
          </Body>
        </Glass>
      ) : (
        <View style={{ gap: 11, marginTop: 16 }}>
          {habits.map((h) => {
            const log = logFor(h.id);
            const streak = computeStreak(h, log);
            const { levels, pct } = summarize(h, log);
            return (
              <Pressable key={h.id} onPress={() => router.push(`/habit/${h.id}`)}>
                <Glass radius={20} style={{ padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 10,
                        backgroundColor: tint(h.accent, theme.scheme === 'dark' ? '33' : '22'),
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Body size={16}>{h.emoji}</Body>
                    </View>
                    <Display size={14} weight="600" style={{ flex: 1 }}>
                      {h.name}
                    </Display>
                    <Body size={11.5} secondary>
                      🔥 {streak} · {pct}%
                    </Body>
                  </View>
                  <Heatmap levels={levels} accent={h.accent} columns={30} gap={2} radius={1.5} />
                </Glass>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
