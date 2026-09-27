/**
 * App-wide settings provider. Applies theme + accent to the document and
 * keeps every surface (side panel, popup, options) in sync through
 * storage.onChanged — settings change in one place, update everywhere.
 */

import { browser } from '#imports';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { applyTheme, loadSettings, saveSetting } from '../lib/settings';
import type { StorageChangeMap } from '../lib/browser-types';
import { DEFAULT_SETTINGS, type SettingKey, type Settings } from '../lib/messages';

interface AppSettingsContextValue {
  settings: Settings;
  setSetting: (key: SettingKey, value: Settings[SettingKey]) => void;
}

const AppSettingsContext = createContext<AppSettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  setSetting: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    void loadSettings().then((loaded) => {
      setSettings(loaded);
      applyTheme(document, loaded);
    });
  }, []);

  // React to OS theme changes while following 'system'.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => applyTheme(document, settings);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings]);

  // React to settings changed anywhere else.
  useEffect(() => {
    const listener = (changes: StorageChangeMap, area: string) => {
      if (area !== 'local') return;
      setSettings((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
          if (changes[key]) (next[key] as unknown) = changes[key].newValue;
        }
        applyTheme(document, next);
        return next;
      });
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    applyTheme(document, settings);
  }, [settings]);

  const setSetting = useCallback((key: SettingKey, value: Settings[SettingKey]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    void saveSetting(key, value);
  }, []);

  const value = useMemo(() => ({ settings, setSetting }), [settings, setSetting]);
  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings(): AppSettingsContextValue {
  return useContext(AppSettingsContext);
}

export function useLearningMode(): boolean {
  return useContext(AppSettingsContext).settings.learningMode;
}
