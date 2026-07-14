import { useCallback, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    // Bootstrap 5.3 reads this to recolor its own components (cards, inputs...).
    root.setAttribute('data-bs-theme', theme);
};

const getInitialTheme = (): Theme => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// App-wide light/dark theme, persisted in localStorage and mirrored onto the
// <html> element as data-theme (our tokens) and data-bs-theme (Bootstrap).
export const useTheme = () => {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    }, []);

    return { theme, isDark: theme === 'dark', toggleTheme };
};
