import { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { spacing, radius, fontSize, lineHeight, useColors, ColorPalette } from '../../theme';

interface Props {
  text: string;
  style?: ViewStyle;
}

export function ExampleBox({ text, style }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.box, style]}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    box: {
      backgroundColor: colors.paper[50],
      borderLeftWidth: 2,
      borderLeftColor: colors.sage[400],
      borderTopRightRadius: radius.md,
      borderBottomRightRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: 14,
    },
    text: {
      fontSize: fontSize.bodySmall,
      color: colors.paper[700],
      lineHeight: fontSize.bodySmall * lineHeight.relaxed,
      fontStyle: 'italic',
    },
  });
}
