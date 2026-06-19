import { useState, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Dimensions, StyleSheet } from 'react-native';

const COLORS = ['#F2683C', '#34C77B', '#6C5CE7', '#F5A623', '#2BB8B0', '#FF6B5E'];
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Piece = {
  x: number;
  size: number;
  round: number;
  color: string;
  delay: number;
  duration: number;
};

/** Soft confetti burst shown on the "all done today" milestone. Fades out after ~5s. */
export function Confetti({ count = 18 }: { count?: number }) {
  const [visible, setVisible] = useState(true);
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, 4300);
    return () => clearTimeout(t);
  }, []);

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        x: (i / count) * SCREEN_W * 0.92 + (i % 4) * 5,
        size: 7 + (i % 3) * 3,
        round: i % 2 ? 2 : 50,
        color: COLORS[i % COLORS.length],
        delay: (i % 5) * 180,
        duration: 1600 + (i % 3) * 200,
      })),
    [count],
  );

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: containerOpacity }]}>
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} piece={p} />
      ))}
    </Animated.View>
  );
}

function ConfettiPiece({ piece }: { piece: Piece }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: piece.duration,
        delay: piece.delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [t, piece.delay, piece.duration]);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [-14, SCREEN_H] });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const opacity = t.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 1, 1, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: piece.x,
        width: piece.size,
        height: piece.size,
        borderRadius: piece.round,
        backgroundColor: piece.color,
        opacity,
        transform: [{ translateY }, { rotate }],
      }}
    />
  );
}
