import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

const THEME_STORAGE_KEY = 'socialsync_theme';

function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function getStoredTheme() {
  if (typeof window === 'undefined') return 'system';
  try {
    const userStr = localStorage.getItem('socialsync_user');
    const userId = userStr ? JSON.parse(userStr)?.id : null;
    if (userId) {
      const userTheme = localStorage.getItem(`${THEME_STORAGE_KEY}_${userId}`);
      if (userTheme && ['light', 'dark', 'system'].includes(userTheme)) {
        return userTheme;
      }
    }
    const globalTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (globalTheme && ['light', 'dark', 'system'].includes(globalTheme)) {
      return globalTheme;
    }
  } catch (e) {
    console.warn('Failed to access localStorage for theme:', e);
  }
  return 'system';
}

function applyThemeToDocument(resolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;

  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
    if (body) {
      body.classList.add('dark');
      body.setAttribute('data-theme', 'dark');
      body.style.colorScheme = 'dark';
    }
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
    if (body) {
      body.classList.remove('dark');
      body.setAttribute('data-theme', 'light');
      body.style.colorScheme = 'light';
    }
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  // Compute effective resolved theme ('light' or 'dark')
  const resolvedTheme = theme === 'system' ? systemTheme : theme;
  const isDark = resolvedTheme === 'dark';

  // Apply immediately to HTML and Body elements whenever resolved theme changes
  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  // Listen to OS system color-scheme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e) => {
      const newSys = e.matches ? 'dark' : 'light';
      setSystemTheme(newSys);
      if (theme === 'system') {
        applyThemeToDocument(newSys);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, [theme]);

  // Listen for theme preference changes across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === THEME_STORAGE_KEY) {
        if (e.newValue && ['light', 'dark', 'system'].includes(e.newValue)) {
          setThemeState(e.newValue);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setTheme = useCallback((newTheme) => {
    if (!['light', 'dark', 'system'].includes(newTheme)) return;

    setThemeState(newTheme);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      const userStr = localStorage.getItem('socialsync_user');
      const userId = userStr ? JSON.parse(userStr)?.id : null;
      if (userId) {
        localStorage.setItem(`${THEME_STORAGE_KEY}_${userId}`, newTheme);
      }
    } catch (e) {
      console.warn('Failed to save theme preference:', e);
    }

    const nextResolved = newTheme === 'system' ? getSystemTheme() : newTheme;
    applyThemeToDocument(nextResolved);
  }, []);

  const toggleTheme = useCallback(() => {
    // If currently dark, flip to light; if currently light, flip to dark
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  }, [resolvedTheme, setTheme]);

  const setAuthUser = useCallback((user) => {
    if (user?.id) {
      try {
        const userSaved = localStorage.getItem(`${THEME_STORAGE_KEY}_${user.id}`);
        if (userSaved && ['light', 'dark', 'system'].includes(userSaved)) {
          setTheme(userSaved);
        }
      } catch (e) {}
    }
  }, [setTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        isDark,
        setTheme,
        toggleTheme,
        setAuthUser
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
export default ThemeProvider;
