import { ThemeColors, ThemeId } from '../models/presentation';

export const THEMES: Record<ThemeId, ThemeColors> = {
  modern: {
    id: 'modern',
    name: 'Modern Slate',
    bgColor: '#FFFFFF',
    bgHex: 'FFFFFF',
    titleColor: '#0F172A',
    titleHex: '0F172A',
    bodyColor: '#334155',
    bodyHex: '334155',
    accentColor: '#4F46E5',
    accentHex: '4F46E5',
    cardBg: '#F8FAFC',
    border: '#E2E8F0',
    isDark: false,
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Cobalt',
    bgColor: '#F8FAFC',
    bgHex: 'F8FAFC',
    titleColor: '#0C4A6E',
    titleHex: '0C4A6E',
    bodyColor: '#1E293B',
    bodyHex: '1E293B',
    accentColor: '#0284C7',
    accentHex: '0284C7',
    cardBg: '#F0F9FF',
    border: '#BAE6FD',
    isDark: false,
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Minimal',
    bgColor: '#FAFAFA',
    bgHex: 'FAFAFA',
    titleColor: '#064E3B',
    titleHex: '064E3B',
    bodyColor: '#1C1917',
    bodyHex: '1C1917',
    accentColor: '#059669',
    accentHex: '059669',
    cardBg: '#F0FDF4',
    border: '#A7F3D0',
    isDark: false,
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Terracotta',
    bgColor: '#FFFDF9',
    bgHex: 'FFFDF9',
    titleColor: '#7C2D12',
    titleHex: '7C2D12',
    bodyColor: '#292524',
    bodyHex: '292524',
    accentColor: '#EA580C',
    accentHex: 'EA580C',
    cardBg: '#FFF7ED',
    border: '#FED7AA',
    isDark: false,
  },
  dark: {
    id: 'dark',
    name: 'Obsidian Tech',
    bgColor: '#0F172A',
    bgHex: '0F172A',
    titleColor: '#F8FAFC',
    titleHex: 'F8FAFC',
    bodyColor: '#CBD5E1',
    bodyHex: 'CBD5E1',
    accentColor: '#38BDF8',
    accentHex: '38BDF8',
    cardBg: '#1E293B',
    border: '#334155',
    isDark: true,
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'modern';

export function getTheme(id?: string): ThemeColors {
  if (id && id in THEMES) {
    return THEMES[id as ThemeId];
  }
  const match = Object.values(THEMES).find(
    (t) => t.name.toLowerCase() === id?.toLowerCase() || t.id.toLowerCase() === id?.toLowerCase()
  );
  return match || THEMES[DEFAULT_THEME_ID];
}
