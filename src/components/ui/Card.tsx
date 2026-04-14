import { View, ViewStyle, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export function Card({ children, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper.white,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    borderColor: colors.paper[100],
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 0,
    elevation: 1,
  },
});
