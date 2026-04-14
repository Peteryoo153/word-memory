import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, lineHeight } from '../../theme';

interface Props {
  text: string;
  style?: ViewStyle;
}

/** 예문 박스 — 좌측 sage 보더 + paper.50 배경 */
export function ExampleBox({ text, style }: Props) {
  return (
    <View style={[styles.box, style]}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
