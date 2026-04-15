import { useMemo } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { fontSize, fontWeight, letterSpacing, useColors, ColorPalette } from '../../theme';

interface Props {
  text: string;
  style?: TextStyle;
}

export function Label({ text, style }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Text style={[styles.label, style]}>
      {text.toUpperCase()}
    </Text>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    label: {
      fontSize: fontSize.label,
      fontWeight: fontWeight.medium,
      color: colors.terra[500],
      letterSpacing: letterSpacing.label,
      textTransform: 'uppercase',
    },
  });
}
