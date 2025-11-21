import { StyleSheet } from 'react-native';
import { useThemeColors } from '../hooks/use-theme-colors';

/**
 * Hook để tạo dynamic styles dựa trên theme
 * Sử dụng trong các màn hình để tự động áp dụng theme colors
 */
export function useThemeStyles() {
  const colors = useThemeColors();

  return {
    container: {
      flex: 1,
      backgroundColor: colors.containerBackground,
    },
    header: {
      backgroundColor: colors.headerBackground,
    },
    card: {
      backgroundColor: colors.cardBackground,
    },
    section: {
      backgroundColor: colors.sectionBackground,
    },
    text: {
      primary: colors.primaryText,
      secondary: colors.secondaryText,
      placeholder: colors.placeholderText,
    },
    border: {
      color: colors.borderColor,
    },
    search: {
      backgroundColor: colors.searchBackground,
    },
    tab: {
      backgroundColor: colors.tabBackground,
    },
    // Helper để tạo StyleSheet với theme colors
    createStyles: (baseStyles: any) => {
      return StyleSheet.create({
        ...baseStyles,
        // Override các màu hardcoded với theme colors
        container: {
          ...baseStyles.container,
          backgroundColor: baseStyles.container?.backgroundColor || colors.containerBackground,
        },
      });
    },
  };
}

