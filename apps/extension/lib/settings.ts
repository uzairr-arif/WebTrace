import { browser } from '#imports';
import { DEFAULT_SETTINGS, type SettingKey, type Settings } from './messages';

/** Load all settings, merged over defaults (tolerates missing keys). */
export async function loadSettings(): Promise<Settings> {
  try {
    const stored = (await browser.storage.local.get([
      'captureEnabled',
      'themeMode',
      'accentColor',
      'learningMode',
    ])) as Record<string, unknown>;
    return {
      captureEnabled: stored.captureEnabled !== undefined ? stored.captureEnabled === true : DEFAULT_SETTINGS.captureEnabled,
      themeMode: typeof stored.themeMode === 'string' ? (stored.themeMode as Settings['themeMode']) : DEFAULT_SETTINGS.themeMode,
      accentColor: typeof stored.accentColor === 'string' ? stored.accentColor : DEFAULT_SETTINGS.accentColor,
      learningMode: stored.learningMode === true,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSetting(key: SettingKey, value: Settings[SettingKey]): Promise<void> {
  try {
    await browser.storage.local.set({ [key]: value });
  } catch {
    /* storage unavailable (transient) — ignore */
  }
}

/** Resolve 'system' against the OS preference. */
export function resolveThemeMode(mode: Settings['themeMode']): 'dark' | 'light' {
  if (mode !== 'system') return mode;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** Apply theme + accent to a document. Used by every entrypoint. */
export function applyTheme(doc: Document, settings: Settings): void {
  const resolved = resolveThemeMode(settings.themeMode);
  doc.documentElement.dataset.theme = resolved;
  doc.documentElement.style.setProperty('--wt-accent', settings.accentColor);
}
