/**
 * Theme Type Definitions
 */

export type ThemeMode = 'light' | 'dark';

export type ThemeChangeListener = (isDark: boolean, theme: ThemeMode) => void;
