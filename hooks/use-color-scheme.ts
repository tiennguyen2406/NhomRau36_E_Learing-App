import { useTheme } from '@/contexts/ThemeContext';

export function useColorScheme(): 'light' | 'dark' {
  try {
    const { theme } = useTheme();
    return theme;
  } catch {
    // Fallback nếu chưa có ThemeProvider
    const { useColorScheme: useRNColorScheme } = require('react-native');
    return useRNColorScheme() ?? 'light';
  }
}
