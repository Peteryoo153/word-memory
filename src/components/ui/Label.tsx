import { Text, StyleSheet, TextStyle } from 'react-native';
import { colors, fontSize, fontWeight, letterSpacing } from '../../theme';

interface Props {
  text: string;
  style?: TextStyle;
}

/** 카테고리 라벨 — UPPERCASE, terra.500, letterSpacing */
export function Label({ text, style }: Props) {
  return (
    <Text style={[styles.label, style]}>
      {text.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colors.terra[500],
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
  },
});
