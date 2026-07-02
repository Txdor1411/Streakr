import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon, CloseIcon } from '@/components/icons';
import { Segmented } from '@/components/segmented';
import { Body, Display } from '@/components/text';
import { useStore, type HabitType } from '@/design/store';
import { useTheme } from '@/design/theme';
import { HabitColors, Palette, tint } from '@/design/tokens';
import { useWeekStart } from '@/design/week-start';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const EMOJIS = ['💧', '🧘', '🏃', '📚', '🥗', '💪', '🛏️', '🧠', '🎯', '✍️', '🎸', '💊', '☀️', '🚭', '🧹', '💰'];

type TypeLabel = 'Done' | 'Count' | 'Timer';
const TYPE_MAP: Record<TypeLabel, HabitType> = { Done: 'done', Count: 'count', Timer: 'timer' };

export default function CreateHabitScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dark = theme.scheme === 'dark';
  const { addHabit } = useStore();
  const { weekStart } = useWeekStart();
  const dayOrder = weekStart === 'sunday' ? [6, 0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6];

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💧');
  const [color, setColor] = useState<string>(Palette.water);
  const [type, setType] = useState<TypeLabel>('Count');
  const [goal, setGoal] = useState(8);
  const [unit, setUnit] = useState('glasses');
  const [days, setDays] = useState<boolean[]>([true, true, true, true, true, true, true]);

  const sheetBg = dark ? '#16161e' : 'rgba(248,247,250,0.98)';
  const label = (t: string) => (
    <Body size={12} weight="600" muted style={{ marginBottom: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {t}
    </Body>
  );

  const isCount = type === 'Count';
  const isTimer = type === 'Timer';

  const onCreate = () => {
    if (!days.some(Boolean)) return; // need at least one scheduled day
    const finalName = name.trim() || 'New habit';
    let sub: string;
    let finalGoal: number;
    if (isCount) {
      sub = unit.trim() || 'times';
      finalGoal = Math.max(1, goal);
    } else if (isTimer) {
      sub = `${Math.max(1, goal)} min`;
      finalGoal = 1;
    } else {
      sub = unit.trim() || 'session';
      finalGoal = 1;
    }
    addHabit({ emoji, name: finalName, sub, accent: color, type: TYPE_MAP[type], goal: finalGoal, days });
    router.back();
  };

  const stepBtn = { width: 34, height: 34, borderRadius: 11, backgroundColor: theme.fillStrong, alignItems: 'center' as const, justifyContent: 'center' as const };

  return (
    <View style={{ flex: 1, backgroundColor: sheetBg, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 14, paddingBottom: insets.bottom + 26 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: theme.fillStrong, alignSelf: 'center', marginBottom: 16 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <Display size={22} weight="600">
            New habit
          </Display>
          <Pressable onPress={() => router.back()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.fillStrong, alignItems: 'center', justifyContent: 'center' }}>
            <CloseIcon color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Emoji + name */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 16 }}>
          <View style={{ width: 58, height: 58, borderRadius: 18, backgroundColor: tint(color, '2e'), alignItems: 'center', justifyContent: 'center' }}>
            <Body size={30}>{emoji}</Body>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Habit name"
            placeholderTextColor={theme.textMuted}
            maxLength={32}
            style={{ flex: 1, backgroundColor: theme.fill, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontFamily: 'Batica', fontSize: 16, fontWeight: '600', color: theme.textStrong }}
          />
        </View>

        {/* Icon */}
        {label('Icon')}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {EMOJIS.map((e) => {
            const on = e === emoji;
            return (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                style={{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? tint(color, '2e') : theme.fill, borderWidth: on ? 2 : 0, borderColor: color }}>
                <Body size={21}>{e}</Body>
              </Pressable>
            );
          })}
        </View>

        {/* Color */}
        {label('Color')}
        <View style={{ flexDirection: 'row', gap: 11, marginBottom: 18 }}>
          {HabitColors.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: c,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: color === c ? 3 : 0,
                borderColor: dark ? '#16161e' : '#fff',
                ...(color === c ? { shadowColor: c, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 0 } } : null),
              }}>
              {color === c && <CheckIcon size={15} width={3.2} />}
            </Pressable>
          ))}
        </View>

        {/* Type */}
        {label('Type')}
        <View style={{ marginBottom: 18 }}>
          <Segmented
            options={['✓ Done', '123 Count', '⏱ Timer']}
            value={type === 'Done' ? '✓ Done' : type === 'Count' ? '123 Count' : '⏱ Timer'}
            onChange={(v) => setType(v.includes('Count') ? 'Count' : v.includes('Timer') ? 'Timer' : 'Done')}
            paddingH={14}
          />
        </View>

        {/* Goal + unit (count / timer only) */}
        {(isCount || isTimer) && (
          <View style={{ flexDirection: 'row', gap: 11, marginBottom: 18 }}>
            <View style={{ flex: 1, backgroundColor: theme.fill, borderRadius: 14, padding: 12 }}>
              <Body size={11} muted style={{ marginBottom: 6 }}>
                {isTimer ? 'Minutes' : 'Daily goal'}
              </Body>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Pressable onPress={() => setGoal((g) => Math.max(1, g - 1))} style={stepBtn}>
                  <Body size={20} weight="700" color={theme.textSecondary}>
                    −
                  </Body>
                </Pressable>
                <Display size={18} weight="700">
                  {goal}
                </Display>
                <Pressable onPress={() => setGoal((g) => g + 1)} style={stepBtn}>
                  <Body size={18} weight="700" color={theme.textSecondary}>
                    +
                  </Body>
                </Pressable>
              </View>
            </View>
            {isCount && (
              <View style={{ flex: 1, backgroundColor: theme.fill, borderRadius: 14, padding: 12 }}>
                <Body size={11} muted style={{ marginBottom: 6 }}>
                  Unit
                </Body>
                <TextInput
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="glasses"
                  placeholderTextColor={theme.textMuted}
                  maxLength={16}
                  style={{ fontFamily: 'Batica', fontSize: 16, fontWeight: '600', color: theme.textStrong, padding: 0 }}
                />
              </View>
            )}
          </View>
        )}

        {/* Schedule */}
        {label('Schedule')}
        <View style={{ flexDirection: 'row', gap: 7, marginBottom: 22 }}>
          {dayOrder.map((i) => {
            const on = days[i];
            return (
              <Pressable
                key={i}
                onPress={() => setDays((prev) => prev.map((p, j) => (j === i ? !p : p)))}
                style={{ flex: 1, aspectRatio: 1, borderRadius: 11, backgroundColor: on ? color : theme.fillStrong, alignItems: 'center', justifyContent: 'center' }}>
                <Body size={13} weight="700" color={on ? '#fff' : theme.textMuted}>
                  {DAYS[i]}
                </Body>
              </Pressable>
            );
          })}
        </View>

        {/* Submit */}
        <Pressable
          onPress={onCreate}
          style={{ height: 54, borderRadius: 18, backgroundColor: color, alignItems: 'center', justifyContent: 'center', shadowColor: color, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }}>
          <Display size={16} weight="600" color="#fff">
            Create habit
          </Display>
        </Pressable>
      </ScrollView>
    </View>
  );
}
