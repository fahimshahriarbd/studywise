export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'studywise_theme';

export function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // fallback
  }
  return 'light';
}

export function applyTheme(theme: ThemeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.dispatchEvent(new CustomEvent('studywise_theme_change', { detail: theme }));
  } catch {
    // ignore
  }
}

// Initialize on module load
if (typeof document !== 'undefined') {
  applyTheme(getInitialTheme());
}
