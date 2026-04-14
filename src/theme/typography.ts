import { Platform } from 'react-native';

export const fontFamily = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
  sans:  Platform.select({ ios: 'System',  android: 'Roboto', default: 'System' }),
  mono:  Platform.select({ ios: 'Courier New', android: 'monospace', default: 'Courier New' }),
} as const;

export const fontSize = {
  displayWord: 38,   // 단어 카드 메인 단어 (32→38)
  h1:          26,   // 페이지 타이틀 (24→26)
  h2:          20,   // 섹션 제목 (18→20)
  body:        17,   // 본문 (16→17)
  bodySmall:   15,   // 작은 본문 (14→15)
  caption:     13,   // 캡션 (동일)
  label:       11,   // 라벨 (동일)
} as const;

export const fontWeight = {
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,
} as const;

export const lineHeight = {
  tight:   1.25,
  normal:  1.55,
  relaxed: 1.7,
  loose:   1.85,
} as const;

export const letterSpacing = {
  label:  1.4,
  normal: 0,
} as const;
