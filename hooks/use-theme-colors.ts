import { useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';

/**
 * Hook để lấy tất cả theme colors dựa trên theme hiện tại
 */
export function useThemeColors() {
  const { theme, isDark } = useTheme();

  return useMemo(() => {
    const colors = Colors[theme];
    
    return {
      ...colors,
      // Thêm các màu bổ sung cho dark mode
      cardBackground: isDark ? '#1E1E1E' : '#fff',
      sectionBackground: isDark ? '#1E1E1E' : '#fff',
      borderColor: isDark ? '#333' : '#e0e0e0',
      placeholderText: isDark ? '#9BA1A6' : '#999',
      secondaryText: isDark ? '#9BA1A6' : '#666',
      primaryText: isDark ? '#ECEDEE' : '#333',
      searchBackground: isDark ? '#2A2A2A' : '#f5f5f5',
      tabBackground: isDark ? '#2A2A2A' : '#f0f0f0',
      headerBackground: isDark ? '#1E1E1E' : '#fff',
      containerBackground: isDark ? '#151718' : '#f8f8f8',
    };
  }, [theme, isDark]);
}

