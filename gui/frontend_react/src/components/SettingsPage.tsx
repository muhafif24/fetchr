import { FolderOpen, FileText, CheckCircle, Cpu, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import type { AppSettings } from '@/hooks/usePyApi';

interface Props {
  settings: AppSettings;
  onSave: (settings: AppSettings) => Promise<void>;
  onBrowseFolder: () => Promise<string | null>;
  onBrowseCookieFile: () => Promise<string | null>;
  ffmpegAvailable: boolean;
  ffmpegSource: string | null;
  onSetupFfmpeg: () => void;
}

const FORMAT_OPTIONS = [
  { value: 'best',      label: 'Best Quality (Auto)' },
  { value: 'bestaudio', label: 'Audio Only (MP3)' },
  { value: '1080p',     label: '1080p Full HD' },
  { value: '720p',      label: '720p HD' },
  { value: '480p',      label: '480p' },
  { value: '360p',      label: '360p' },
];

const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Indonesian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
];

export function SettingsPage({ settings, onSave, onBrowseFolder, onBrowseCookieFile, ffmpegAvailable, ffmpegSource, onSetupFfmpeg }: Props) {
  const [local, setLocal] = useState<AppSettings>({ ...settings });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const updateNotify = (key: keyof AppSettings['notify'], value: boolean) => {
    setLocal((prev) => ({ ...prev, notify: { ...prev.notify, [key]: value } }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(local);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleBrowseFolder = async () => {
    const path = await onBrowseFolder();
    if (path) update('outputDir', path);
  };

  const handleBrowseCookie = async () => {
    const path = await onBrowseCookieFile();
    if (path) update('cookieFile', path);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* General */}
      <Section title="General">
        <Field label="Default download folder">
          <div className="flex gap-2">
            <Input
              value={local.outputDir}
              readOnly
              className="bg-zinc-900 border-zinc-800 text-zinc-400 text-xs h-8 min-w-0"
            />
            <Button
              variant="outline"
              onClick={handleBrowseFolder}
              className="h-8 px-3 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-400 text-xs shrink-0"
            >
              <FolderOpen className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Field>

        <Field label="Default format">
          <select
            value={local.defaultFormat}
            onChange={(e) => update('defaultFormat', e.target.value)}
            className="w-full h-8 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-3 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          >
            {FORMAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Default subtitle language">
          <select
            value={local.subtitleLang}
            onChange={(e) => update('subtitleLang', e.target.value)}
            className="w-full h-8 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-3 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          >
            {LANG_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Toggle
          label="Embed subtitles automatically"
          description="Subtitles are embedded directly into the video file"
          checked={local.embedSubs}
          onChange={(v) => update('embedSubs', v)}
        />

        <Toggle
          label="Start minimized to tray"
          description="App hides to system tray on launch"
          checked={local.startMinimized}
          onChange={(v) => update('startMinimized', v)}
        />
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Toggle
          label="Notify when download completes"
          checked={local.notify.onComplete}
          onChange={(v) => updateNotify('onComplete', v)}
        />
        <Toggle
          label="Notify when download fails"
          checked={local.notify.onError}
          onChange={(v) => updateNotify('onError', v)}
        />
      </Section>

      {/* Advanced */}
      <Section title="Advanced">
        <Field label="Max concurrent downloads" hint="1 – 5">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={5}
              value={local.concurrentDownloads}
              onChange={(e) => update('concurrentDownloads', Number(e.target.value))}
              className="flex-1 accent-violet-500"
            />
            <span className="text-sm font-semibold text-zinc-300 w-4 text-center tabular-nums">
              {local.concurrentDownloads}
            </span>
          </div>
        </Field>

        <Field label="Download speed limit" hint='e.g. "5M" or "500K" — leave blank for unlimited'>
          <Input
            value={local.rateLimit}
            onChange={(e) => update('rateLimit', e.target.value)}
            placeholder="5M"
            className="h-8 bg-zinc-900 border-zinc-800 text-zinc-300 text-xs"
          />
        </Field>

        <Field label="Proxy" hint="HTTP/SOCKS — e.g. socks5://127.0.0.1:1080">
          <Input
            value={local.proxy}
            onChange={(e) => update('proxy', e.target.value)}
            placeholder="http://proxy:port"
            className="h-8 bg-zinc-900 border-zinc-800 text-zinc-300 text-xs"
          />
        </Field>

        <Field label="Cookie file" hint="For content that requires login">
          <div className="flex gap-2">
            <Input
              value={local.cookieFile}
              readOnly
              placeholder="Not selected"
              className="bg-zinc-900 border-zinc-800 text-zinc-400 text-xs h-8 min-w-0"
            />
            <Button
              variant="outline"
              onClick={handleBrowseCookie}
              className="h-8 px-3 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-400 text-xs shrink-0"
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>
            {local.cookieFile && (
              <Button
                variant="outline"
                onClick={() => update('cookieFile', '')}
                className="h-8 px-3 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-500 text-xs shrink-0"
              >
                Clear
              </Button>
            )}
          </div>
        </Field>
      </Section>

      {/* Dependencies */}
      <Section title="Dependencies">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
              ffmpegAvailable
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'bg-zinc-800 border border-zinc-700'
            )}>
              <Cpu className={cn('h-4 w-4', ffmpegAvailable ? 'text-emerald-400' : 'text-zinc-500')} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-300">FFmpeg</span>
                {ffmpegAvailable ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-1.5 py-0.5 rounded">
                    <CheckCircle className="h-2.5 w-2.5" /> Installed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 bg-zinc-800/60 border border-zinc-700/40 px-1.5 py-0.5 rounded">
                    <AlertCircle className="h-2.5 w-2.5" /> Not found
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-600 mt-0.5 truncate">
                {ffmpegAvailable
                  ? (ffmpegSource === 'appdata' ? '%APPDATA%\\Fetchr\\bin\\' : ffmpegSource === 'bundled' ? 'Bundled' : 'System PATH')
                  : 'Required for merging, audio extraction, and subtitles'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onSetupFfmpeg}
            className="h-8 px-3 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs shrink-0"
          >
            {ffmpegAvailable ? 'Re-install' : 'Install FFmpeg'}
          </Button>
        </div>
      </Section>

      {/* Save button */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-5"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{title}</h2>
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl divide-y divide-zinc-800/60">
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 space-y-1.5">
      <div className="flex items-baseline gap-2">
        <label className="text-sm text-zinc-300">{label}</label>
        {hint && <span className="text-xs text-zinc-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 cursor-pointer group"
      onClick={() => onChange(!checked)}
    >
      <div>
        <p className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">{label}</p>
        {description && <p className="text-xs text-zinc-600 mt-0.5">{description}</p>}
      </div>
      <div
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors shrink-0',
          checked ? 'bg-violet-600' : 'bg-zinc-700'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5'
          )}
        />
      </div>
    </div>
  );
}
