import { useMemo } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/design/theme';
import { Palette, shade } from '@/design/tokens';

/** Ice-blue used for frozen (protected) cells. */
const FREEZE_COLOR = Palette.freeze + '99';

/** Sentinel level meaning "not scheduled that day" — dimmer than a missed day. */
export const UNSCHEDULED_LEVEL = -2;
const UNSCHEDULED_OPACITY = 0.35;

type HeatmapProps = {
  levels: number[];
  accent: string;
  /** Row-major: fixed column count. Column-major (GitHub year): fixed row count. */
  flow?: 'row' | 'column';
  columns?: number;
  rows?: number;
  gap?: number;
  radius?: number;
};

/**
 * The signature "little squares" grid. Cells are flex-sized squares so the grid
 * always fills its container width — no measuring required.
 */
export function Heatmap({
  levels,
  accent,
  flow = 'row',
  columns = 30,
  rows = 7,
  gap = 2,
  radius = 1.5,
}: HeatmapProps) {
  const theme = useTheme();

  const matrix = useMemo(() => {
    if (flow === 'column') {
      const cols = Math.ceil(levels.length / rows);
      const grid: (number | null)[][] = [];
      for (let r = 0; r < rows; r++) {
        const row: (number | null)[] = [];
        for (let c = 0; c < cols; c++) {
          const idx = c * rows + r;
          row.push(idx < levels.length ? levels[idx] : null);
        }
        grid.push(row);
      }
      return grid;
    }
    const rowCount = Math.ceil(levels.length / columns);
    const grid: (number | null)[][] = [];
    for (let r = 0; r < rowCount; r++) {
      const row: (number | null)[] = [];
      for (let c = 0; c < columns; c++) {
        const idx = r * columns + c;
        row.push(idx < levels.length ? levels[idx] : null);
      }
      grid.push(row);
    }
    return grid;
  }, [levels, flow, columns, rows]);

  return (
    <View style={{ gap }}>
      {matrix.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap }}>
          {row.map((level, c) => (
            <View
              key={c}
              style={{
                flex: 1,
                aspectRatio: 1,
                borderRadius: radius,
                opacity: level === UNSCHEDULED_LEVEL ? UNSCHEDULED_OPACITY : 1,
                backgroundColor:
                  level == null
                    ? 'transparent'
                    : level === -1
                      ? FREEZE_COLOR
                      : level === UNSCHEDULED_LEVEL
                        ? theme.heatmapEmpty
                        : shade(theme, accent, level),
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Less ▢▢▢▢▢ More legend strip. Pass showFreeze to append an ice cell. */
export function HeatmapLegend({ accent, showFreeze = false }: { accent: string; showFreeze?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {[0, 1, 2, 3, 4].map((l) => (
        <View
          key={l}
          style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: shade(theme, accent, l) }}
        />
      ))}
      {showFreeze && (
        <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: FREEZE_COLOR, marginLeft: 3 }} />
      )}
    </View>
  );
}
