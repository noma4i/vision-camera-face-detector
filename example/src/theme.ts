import type { TextStyle } from 'react-native';

export const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  success: '#3DDC84',
  overlay: 'rgba(0, 0, 0, 0.6)'
} as const;

export const THEME = {
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400'
  } satisfies TextStyle,
  fontSize13: {
    fontSize: 13,
    lineHeight: 18
  } satisfies TextStyle,
  semibold: {
    fontWeight: '600'
  } satisfies TextStyle
} as const;
