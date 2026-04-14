export const colors = {

  // Primary — "Cobalt" (집중·지식·신뢰)
  // 기존 sage(연두빛)에서 → 선명한 코발트 블루로 교체
  sage: {
    900: '#0B1D6E',
    800: '#1228A0',
    700: '#1A3ABF',
    600: '#2952CC',   // ← 메인 버튼 / 활성 색상
    500: '#4169E1',
    400: '#7394ED',
    300: '#A8BEF5',
    200: '#D4E0FA',
    100: '#EBF0FE',
    50:  '#F4F7FF',
  },

  // Neutral — "Dusk" (따뜻하되 더 풍부한 뉴트럴)
  paper: {
    900: '#0F0D1A',
    800: '#1E1B31',
    700: '#3B3756',
    600: '#5B587E',
    500: '#8481A4',
    400: '#AAAAC8',
    300: '#CCCCE0',
    200: '#E0DDEF',
    100: '#EEEEF8',
    50:  '#F6F5FC',
    white: '#FDFCFF',
    bg:    '#F0EFF8',   // 아주 연한 라벤더 — 흰색보다 고급스러운 배경
  },

  // Accent — "Coral" (강조·오류·복습 알림)
  terra: {
    700: '#8B1C0C',
    600: '#B02D1C',
    500: '#D44235',
    400: '#E8796E',
    200: '#F7CAC6',
    100: '#FEF1EF',
  },

  semantic: {
    success: '#0D9E6E',
    warning: '#D97706',
    error:   '#D44235',
    info:    '#2952CC',
  },

} as const;
