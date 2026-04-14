import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { colors, radius, fontSize, fontWeight } from '../../theme';

type Variant = 'primary' | 'secondary' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  style?: ViewStyle;
  disabled?: boolean;
  loading?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  style,
  disabled,
  loading,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], (disabled || loading) && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.paper[600] : colors.paper.white} />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.sage[600],
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: colors.paper[300],
  },
  danger: {
    backgroundColor: colors.terra[100],
    borderWidth: 0.5,
    borderColor: colors.terra[200],
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: fontSize.bodySmall,
    fontWeight: fontWeight.medium,
  },
  primaryLabel: {
    color: colors.paper.white,
  },
  secondaryLabel: {
    color: colors.paper[600],
  },
  dangerLabel: {
    color: colors.semantic.error,
  },
});
