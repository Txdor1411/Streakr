import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { size?: number; color: string; active?: boolean };

/** Today — 2×2 rounded squares (two emphasized). */
export function TodayIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Rect x="3" y="3" width="8" height="8" rx="2.5" />
      <Rect x="13" y="3" width="8" height="8" rx="2.5" opacity={0.5} />
      <Rect x="3" y="13" width="8" height="8" rx="2.5" opacity={0.5} />
      <Rect x="13" y="13" width="8" height="8" rx="2.5" />
    </Svg>
  );
}

/** Habits — scattered small squares (mosaic motif). */
export function HabitsIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Rect x="3" y="11" width="4" height="4" rx="1.2" />
      <Rect x="10" y="6" width="4" height="4" rx="1.2" />
      <Rect x="17" y="9" width="4" height="4" rx="1.2" />
      <Rect x="10" y="14" width="4" height="4" rx="1.2" />
    </Svg>
  );
}

/** Insights — ascending bars. */
export function InsightsIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M5 19V11M12 19V5M19 19v-5" />
    </Svg>
  );
}

/** Settings — sliders. */
export function SettingsIcon({ size = 22, color, active }: IconProps) {
  const dot = active ? color : 'transparent';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M4 7h16M4 12h16M4 17h16" />
      <Circle cx="9" cy="7" r="2" fill={dot} />
      <Circle cx="15" cy="12" r="2" fill={dot} />
      <Circle cx="8" cy="17" r="2" fill={dot} />
    </Svg>
  );
}

/** Feed — overlapping photo frames (social proof motif). */
export function FeedIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round">
      <Rect x="4" y="4" width="13" height="13" rx="3" />
      <Rect x="8" y="8" width="13" height="13" rx="3" />
    </Svg>
  );
}

/** Users — two friends. */
export function UsersIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="9" cy="8" r="3.2" />
      <Path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <Path d="M16 5.2a3.2 3.2 0 0 1 0 5.6" />
      <Path d="M17 14.2A5.5 5.5 0 0 1 20.5 19" />
    </Svg>
  );
}

/** Camera — capture proof. */
export function CameraIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z" />
      <Circle cx="12" cy="13" r="3.4" />
    </Svg>
  );
}

/** Image — pick from gallery. */
export function ImageIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="4" y="4" width="16" height="16" rx="3" />
      <Circle cx="9" cy="9.5" r="1.6" />
      <Path d="M5 17l4.5-4.5a2 2 0 0 1 2.8 0L19 19" />
    </Svg>
  );
}

export function CheckIcon({ size = 20, color = '#fff', width = 3 }: { size?: number; color?: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13l4 4L19 7" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PlusIcon({ size = 24, color = '#fff', width = 2.6 }: { size?: number; color?: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={width} strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronLeft({ size = 18, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 5l-7 7 7 7" />
    </Svg>
  );
}

export function ChevronRight({ size = 18, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function EditIcon({ size = 16, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
    </Svg>
  );
}

export function PlayIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5v14l11-7z" />
    </Svg>
  );
}

export function UploadIcon({ size = 26, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 16V4M7 9l5-5 5 5" />
      <Path d="M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />
    </Svg>
  );
}

export function ArrowRight({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

export function CloseIcon({ size = 14, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
