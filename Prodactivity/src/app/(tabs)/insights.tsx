import { LinearGradient as RNLinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Polyline, Stop } from 'react-native-svg';

import { Glass } from '@/components/glass';
import { Heatmap } from '@/components/heatmap';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { Body, Display } from '@/components/text';
import { dateKey, useStore, weekdayMon0 } from '@/design/store';
import { useTheme } from '@/design/theme';
import { Palette, tint } from '@/design/tokens';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const RANGE_DAYS = { W: 7, M: 30, Y: 365 } as const;
const RANGE_PREV_LABEL = { W: 'vs last week', M: 'vs last month', Y: 'vs last year' } as const;
const RANGE_SUBTITLE = { W: 'Your momentum this week', M: 'Your momentum this month', Y: 'Your momentum this year' } as const;
const DENSITY_DAYS = 98; // 14 columns × 7

type Range = keyof typeof RANGE_DAYS;

type DayStat = { date: Date; rate: number | null; doneCount: number; active: boolean; frozen: boolean };

function rateToLevel(rate: number | null) {
  if (rate == null || rate <= 0) return 0;
  return Math.max(1, Math.min(4, Math.ceil(rate * 4)));
}

export default function InsightsScreen() {
  const theme = useTheme();
  const [range, setRange] = useState<Range>('W');
  const stroke = theme.accent;
  const { habits, logFor, frozenDates } = useStore();

  const data = useMemo(() => {
    const habitLogs = habits.map((h) => ({ h, log: logFor(h.id) }));
    const dayStat = (date: Date): DayStat => {
      const wd = weekdayMon0(date);
      const key = dateKey(date);
      const frozen = frozenDates.has(key);
      let scheduled = 0;
      let scheduledDone = 0;
      let doneCount = 0;
      let active = false;
      for (const { h, log } of habitLogs) {
        const amount = log[key] ?? 0;
        const met = amount >= h.goal;
        if (amount > 0) active = true;
        if (met) doneCount++;
        if (h.days[wd]) {
          scheduled++;
          if (met) scheduledDone++;
        }
      }
      // Frozen days count as fully completed for streak-consistent stats.
      if (frozen && scheduled > 0) {
        active = true;
        doneCount += scheduled - scheduledDone;
        scheduledDone = scheduled;
      }
      return { date, rate: scheduled > 0 ? scheduledDone / scheduled : null, doneCount, active, frozen };
    };

    // Build a long history once (covers the largest window + previous window).
    const now = new Date();
    const span = RANGE_DAYS.Y * 2 + DENSITY_DAYS;
    const history: DayStat[] = [];
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      history.push(dayStat(d));
    }
    const lastN = (n: number, offset = 0) => history.slice(history.length - n - offset, history.length - offset);

    const meanRate = (days: DayStat[]) => {
      const rated = days.filter((d) => d.rate != null) as (DayStat & { rate: number })[];
      if (rated.length === 0) return 0;
      return rated.reduce((a, d) => a + d.rate, 0) / rated.length;
    };
    const meanCompletions = (days: DayStat[]) => (days.length === 0 ? 0 : days.reduce((a, d) => a + d.doneCount, 0) / days.length);

    const n = RANGE_DAYS[range];
    const window = lastN(n);
    const prevWindow = lastN(n, n);

    const curRate = meanRate(window);
    const prevRate = meanRate(prevWindow);
    const momentum = prevRate > 0 ? Math.round(((curRate - prevRate) / prevRate) * 100) : curRate > 0 ? 100 : 0;

    const curAvg = meanCompletions(window);
    const avgDelta = curAvg - meanCompletions(prevWindow);

    // Trend: W/M → daily points, Y → 12 monthly buckets.
    let trend: number[];
    let axis: [string, string, string];
    if (range === 'Y') {
      const buckets: number[] = [];
      for (let m = 11; m >= 0; m--) {
        const ref = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const monthDays = history.filter((d) => d.date.getFullYear() === ref.getFullYear() && d.date.getMonth() === ref.getMonth());
        buckets.push(meanRate(monthDays) * 100);
      }
      trend = buckets;
      const monthName = (back: number) => new Date(now.getFullYear(), now.getMonth() - back, 1).toLocaleDateString(undefined, { month: 'short' });
      axis = [monthName(11), monthName(6), monthName(0)];
    } else {
      trend = window.map((d) => (d.rate ?? 0) * 100);
      const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      axis = [fmt(window[0].date), fmt(window[Math.floor(window.length / 2)].date), fmt(window[window.length - 1].date)];
    }

    // By weekday: mean completion rate per weekday across the window.
    const weekday = WEEKDAY_LABELS.map((label, wd) => {
      const days = window.filter((d) => weekdayMon0(d.date) === wd && d.rate != null) as (DayStat & { rate: number })[];
      const v = days.length ? (days.reduce((a, d) => a + d.rate, 0) / days.length) * 100 : 0;
      return { d: label, v: Math.round(v) };
    });

    // Consistency: last 98 days density + % of days active.
    const density = lastN(DENSITY_DAYS);
    const densityLevels = density.map((d) => (d.frozen ? -1 : rateToLevel(d.rate)));
    const activePct = Math.round((density.filter((d) => d.active).length / DENSITY_DAYS) * 100);

    return { momentum, curAvg, avgDelta, trend, axis, weekday, densityLevels, activePct };
  }, [habits, logFor, frozenDates, range]);

  const rising = data.momentum >= 0;
  const trendPoints = data.trend.length > 1 ? data.trend.map((v, i) => `${((i / (data.trend.length - 1)) * 300).toFixed(1)},${(96 - (Math.max(0, Math.min(100, v)) / 100) * 82).toFixed(1)}`).join(' ') : '0,96 300,96';
  const trendArea = `0,96 ${trendPoints} 300,96`;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <Display size={26} weight="600">
            Insights
          </Display>
          <Body size={13} secondary style={{ marginTop: 6 }}>
            {RANGE_SUBTITLE[range]}
          </Body>
        </View>
        <Segmented options={['W', 'M', 'Y']} value={range} onChange={(v) => setRange(v as Range)} paddingH={11} />
      </View>

      {/* Stat cards */}
      <View style={{ flexDirection: 'row', gap: 11, marginTop: 16 }}>
        <View style={{ flex: 1, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: theme.glassBorder }}>
          <RNLinearGradient
            colors={[tint(rising ? Palette.emerald : Palette.coral, theme.scheme === 'dark' ? '3d' : '2e'), theme.glassBg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Body size={17}>{rising ? '🚀' : '📉'}</Body>
              <Display size={16} weight="600">
                {data.momentum === 0 ? 'Steady' : rising ? 'Rising' : 'Easing'}
              </Display>
            </View>
            <Display size={28} weight="600" color={rising ? (theme.scheme === 'dark' ? Palette.emeraldLight : Palette.emerald) : Palette.coral} style={{ marginTop: 9 }}>
              {data.momentum > 0 ? '+' : ''}
              {data.momentum}%
            </Display>
            <Body size={11.5} secondary style={{ marginTop: 4 }}>
              Momentum {RANGE_PREV_LABEL[range]}
            </Body>
          </RNLinearGradient>
        </View>
        <Glass radius={22} style={{ flex: 1, padding: 15 }}>
          <Body size={11.5} secondary>
            Avg completions
          </Body>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 9 }}>
            <Display size={28} weight="600">
              {data.curAvg.toFixed(1)}
            </Display>
            <Body size={14} muted>
              /day
            </Body>
          </View>
          <Body size={11.5} weight="600" color={data.avgDelta >= 0 ? (theme.scheme === 'dark' ? Palette.emeraldLight : Palette.emerald) : Palette.coral} style={{ marginTop: 6 }}>
            {data.avgDelta >= 0 ? '▲' : '▼'} {Math.abs(data.avgDelta).toFixed(1)} {data.avgDelta >= 0 ? 'higher' : 'lower'}
          </Body>
        </Glass>
      </View>

      {/* Trend line */}
      <Glass radius={22} style={{ padding: 16, marginTop: 13 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <Display size={15} weight="600">
            Completion rate
          </Display>
          <Body size={12} secondary>
            {range === 'Y' ? '12 months' : range === 'M' ? '30 days' : '7 days'}
          </Body>
        </View>
        <Svg viewBox="0 0 300 100" width="100%" height={90} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stroke} stopOpacity={0.3} />
              <Stop offset="1" stopColor={stroke} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Polygon points={trendArea} fill="url(#trend)" />
          <Polyline points={trendPoints} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </Svg>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          {data.axis.map((label, i) => (
            <Body key={i} size={10} muted>
              {label}
            </Body>
          ))}
        </View>
      </Glass>

      {/* Weekday bars + density */}
      <View style={{ flexDirection: 'row', gap: 11, marginTop: 13 }}>
        <Glass radius={22} style={{ flex: 1.3, padding: 16 }}>
          <Display size={15} weight="600" style={{ marginBottom: 12 }}>
            By weekday
          </Display>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {data.weekday.map((w) => (
              <View key={w.d} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%' }}>
                <View style={{ width: '62%', height: `${Math.max(2, w.v)}%`, borderRadius: 5, overflow: 'hidden', backgroundColor: w.v === 0 ? theme.fillStrong : undefined }}>
                  {w.v > 0 && <RNLinearGradient colors={[Palette.coral, '#FFAE85']} style={{ flex: 1 }} />}
                </View>
                <Body size={9} muted>
                  {w.d}
                </Body>
              </View>
            ))}
          </View>
        </Glass>
        <Glass radius={22} style={{ flex: 1, padding: 16 }}>
          <Display size={15} weight="600" style={{ marginBottom: 12 }}>
            Consistency
          </Display>
          <Heatmap levels={data.densityLevels} accent={Palette.coral} columns={14} gap={2} radius={1.5} />
          <Body size={11} secondary style={{ marginTop: 9 }}>
            <Body size={11} weight="600" color={theme.accent}>
              {data.activePct}%
            </Body>{' '}
            of days active
          </Body>
        </Glass>
      </View>
    </Screen>
  );
}
