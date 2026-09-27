import { browser } from '#imports';
import { useState } from 'react';
import { LogoMark } from '../../components/LogoMark';
import { sendToBackground } from '../../lib/messages';
import { useAppSettings } from '../../components/ThemeProvider';
import type { ThemeMode } from '../../lib/messages';

const ACCENT_PRESETS = [
  { name: 'Signal Cyan', value: '#22d3ee' },
  { name: 'Ultraviolet', value: '#a78bfa' },
  { name: 'Emerald', value: '#34d399' },
  { name: 'Amber', value: '#fbbf24' },
  { name: 'Rose', value: '#fb7185' },
  { name: 'Cobalt', value: '#60a5fa' },
];

export function App() {
  const { settings, setSetting } = useAppSettings();
  const [cleared, setCleared] = useState(false);

  const clearAllData = async () => {
    await sendToBackground({ type: 'webtrace:clearAllData' });
    setCleared(true);
    window.setTimeout(() => setCleared(false), 2500);
  };

  return (
    <div className="mx-auto max-w-lg px-5 py-6 text-ink">
      <header className="mb-5 flex items-center gap-2.5">
        <LogoMark size={24} />
        <div>
          <h1 className="text-[16px] font-semibold leading-tight">WebTrace</h1>
          <p className="text-[11px] text-dim">Web Request Flow Explorer — settings & appearance</p>
        </div>
      </header>

      <Card title="Appearance">
        <Row label="Theme" hint="Follow the system, or pin a look.">
          <div className="flex overflow-hidden rounded-lg border border-line">
            {(['system', 'dark', 'light'] as ThemeMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSetting('themeMode', mode)}
                className={`px-3 py-1.5 text-[11.5px] capitalize transition-colors ${
                  settings.themeMode === mode
                    ? 'bg-accent-soft text-accent'
                    : 'text-dim hover:text-ink'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Accent color" hint="Used across the flow graph, pills and highlights.">
          <div className="flex items-center gap-2">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                title={preset.name}
                onClick={() => setSetting('accentColor', preset.value)}
                className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  settings.accentColor.toLowerCase() === preset.value
                    ? 'border-ink'
                    : 'border-transparent'
                }`}
                style={{ background: preset.value }}
                aria-label={preset.name}
              />
            ))}
            <label className="ml-1 flex items-center gap-1.5 text-[11px] text-dim">
              Custom
              <input
                type="color"
                value={settings.accentColor}
                onChange={(e) => setSetting('accentColor', e.target.value)}
                className="size-6 cursor-pointer rounded border border-line bg-transparent"
              />
            </label>
          </div>
        </Row>
      </Card>

      <Card title="Behavior">
        <Row label="Learning Mode" hint="Explain networking terms (CORS, TLS, 304…) as you explore.">
          <Toggle
            checked={settings.learningMode}
            onChange={(v) => setSetting('learningMode', v)}
          />
        </Row>
        <Row label="Capture requests" hint="Global switch. Nothing is recorded while paused.">
          <Toggle
            checked={settings.captureEnabled}
            onChange={(v) => {
              setSetting('captureEnabled', v);
              void sendToBackground({ type: 'webtrace:setCapture', enabled: v });
            }}
          />
        </Row>
      </Card>

      <Card title="Privacy">
        <p className="text-[11.5px] leading-relaxed text-dim">
          WebTrace is local-first: all trace data lives in this browser's IndexedDB and never
          leaves your device. Request and response bodies are never captured. Sensitive headers
          (Authorization, Cookie, API keys…) are masked before storage, and credential-looking
          query parameters are redacted.
        </p>
      </Card>

      <Card title="Data">
        <Row label="Stored sessions" hint="Remove every recorded session from this device.">
          <button
            type="button"
            onClick={() => void clearAllData()}
            className="rounded-lg border border-err/50 px-3 py-1.5 text-[11.5px] font-medium text-err transition-colors hover:bg-err/10"
          >
            Clear all data
          </button>
        </Row>
        {cleared && <p className="text-[11px] text-ok">All stored traces were deleted.</p>}
      </Card>

      <p className="mt-5 text-center text-[10px] text-faint">
        WebTrace v0.1.0 — see how the web actually works.
      </p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-faint">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] leading-snug text-dim">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5.5 w-10 rounded-full border transition-colors ${
        checked ? 'border-accent bg-accent/80' : 'border-line bg-raised'
      }`}
      style={{ height: 22, width: 40 }}
    >
      <span
        className={`absolute top-[2px] size-[16px] rounded-full bg-surface shadow transition-all ${
          checked ? 'left-[21px]' : 'left-[2px]'
        }`}
      />
    </button>
  );
}
