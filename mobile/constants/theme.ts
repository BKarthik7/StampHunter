/** StampHunter design token constants — matching docs/Frontend-Spec.md */

export const Colors = {
  // Core palette
  ink: '#1A1A1A',
  paper: '#F7F4ED',
  paperDark: '#EDE9DF',
  stampRed: '#C0392B',
  stampRedLight: '#FADBD8',
  postmarkBlue: '#1B4F8A',
  postmarkBlueLight: '#D6EAF8',
  white: '#FFFFFF',
  muted: '#7F8C8D',
  border: '#D5CFC3',
  success: '#27AE60',
  error: '#E74C3C',

  // Dark mode overrides (use with Appearance.getColorScheme())
  darkBg: '#1C1B18',
  darkText: '#F0EDE6',
} as const;

export const Typography = {
  // Font families (loaded via expo-font)
  serif: 'PlayfairDisplay_700Bold',
  serifSemiBold: 'PlayfairDisplay_600SemiBold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',

  // Sizes
  hero: 32,
  sectionHeading: 22,
  body: 15,
  label: 14,
  meta: 12,
  stampCount: 28,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

export const Radius = {
  stamp: 2,   // stamps have near-square corners
  card: 8,
  pill: 999,
  modal: 12,
} as const;
