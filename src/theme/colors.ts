// 라이트 팔레트 — 기존 디자인 유지
export const lightColors = {
  // Primary — "Cobalt"
  sage: {
    900: '#0B1D6E',
    800: '#1228A0',
    700: '#1A3ABF',
    600: '#2952CC',   // 메인 버튼 / 활성
    500: '#4169E1',
    400: '#7394ED',
    300: '#A8BEF5',
    200: '#D4E0FA',
    100: '#EBF0FE',
    50:  '#F4F7FF',
  },

  paper: {
    900: '#0F0D1A',   // 메인 텍스트
    800: '#1E1B31',
    700: '#3B3756',
    600: '#5B587E',
    500: '#8481A4',
    400: '#AAAAC8',
    300: '#CCCCE0',
    200: '#E0DDEF',
    100: '#EEEEF8',
    50:  '#F6F5FC',
    white: '#FDFCFF', // 카드 표면
    bg:    '#F0EFF8', // 앱 배경
  },

  terra: {
    700: '#8B1C0C',
    600: '#B02D1C',
    500: '#D44235',   // 오류·강조
    400: '#E8796E',
    200: '#F7CAC6',
    100: '#FEF1EF',   // 옅은 강조 배경
  },

  semantic: {
    success: '#0D9E6E',
    warning: '#D97706',
    error:   '#D44235',
    info:    '#2952CC',
  },

  statusBarStyle: 'dark-content' as 'dark-content' | 'light-content',
} as const;

// 다크 팔레트 — 같은 시맨틱 키 / 의미를 유지
export const darkColors = {
  sage: {
    900: '#F4F7FF',
    800: '#D4E0FA',
    700: '#B2C6F8',
    600: '#7394ED',   // 메인 버튼 / 활성 (다크 위에서 가독성)
    500: '#4169E1',
    400: '#2952CC',
    300: '#1A3ABF',
    200: '#152C7A',
    100: '#0F1F4F',
    50:  '#0A152F',
  },

  paper: {
    900: '#FDFCFF',   // 메인 텍스트 (밝게)
    800: '#EEEEF8',
    700: '#CCCCE0',
    600: '#A6A4C2',
    500: '#8481A4',
    400: '#605D7E',
    300: '#4A4769',
    200: '#34304D',
    100: '#252238',
    50:  '#1A172A',
    white: '#1E1B31', // 카드 표면 (다크 위 한 단계 위)
    bg:    '#0F0D1A', // 앱 배경
  },

  terra: {
    700: '#FEF1EF',
    600: '#F7CAC6',
    500: '#E8796E',   // 오류·강조 (밝게)
    400: '#D44235',
    200: '#5A1E14',   // 다크 강조 배경
    100: '#3A130B',
  },

  semantic: {
    success: '#34D8A8',
    warning: '#F59E0B',
    error:   '#F87171',
    info:    '#7394ED',
  },

  statusBarStyle: 'light-content' as 'dark-content' | 'light-content',
} as const;

export interface ColorPalette {
  sage:  { 900: string; 800: string; 700: string; 600: string; 500: string; 400: string; 300: string; 200: string; 100: string; 50: string };
  paper: { 900: string; 800: string; 700: string; 600: string; 500: string; 400: string; 300: string; 200: string; 100: string; 50: string; white: string; bg: string };
  terra: { 700: string; 600: string; 500: string; 400: string; 200: string; 100: string };
  semantic: { success: string; warning: string; error: string; info: string };
  statusBarStyle: 'dark-content' | 'light-content';
}

// 기본 export — 라이트 (다크 모드 도입 전 코드와의 호환)
export const colors = lightColors;
