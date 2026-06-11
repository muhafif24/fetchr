import { FolderOpen, FileText, CheckCircle, Cpu, AlertCircle, Puzzle, Copy, RefreshCw } from 'lucide-react';
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
  bridgeToken: string | null;
  bridgePort: number;
  extensionDir: string;
  onRegenerateToken: () => void;
  onOpenExtensionFolder: () => void;
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

export function SettingsPage({ settings, onSave, onBrowseFolder, onBrowseCookieFile, ffmpegAvailable, ffmpegSource, onSetupFfmpeg, bridgeToken, bridgePort, extensionDir, onRegenerateToken, onOpenExtensionFolder }: Props) {
  const [local, setLocal] = useState<AppSettings>({ ...settings });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [extGuideTab, setExtGuideTab] = useState<'chromium' | 'firefox'>('chromium');

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

  const handleCopyToken = () => {
    if (!bridgeToken) return;
    navigator.clipboard.writeText(bridgeToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
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
              placeholder="Not configured — click Browse to set"
              className="bg-[#0a0a0a] border-[#242424] text-neutral-400 placeholder:text-neutral-600 text-xs h-8 min-w-0 focus-visible:ring-rose-500/30"
            />
            <Button
              variant="outline"
              onClick={handleBrowseFolder}
              className="h-8 px-3 bg-[#0a0a0a] border-[#242424] hover:bg-[#1a1a1a] text-neutral-400 text-xs shrink-0"
            >
              <FolderOpen className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Field>

        <Field label="Default format">
          <select
            value={local.defaultFormat}
            onChange={(e) => update('defaultFormat', e.target.value)}
            className="w-full h-8 rounded-md bg-[#0a0a0a] border border-[#242424] text-neutral-300 text-xs px-3 focus:outline-none focus:ring-1 focus:ring-rose-500/40"
          >
            {FORMAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#141414]">{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Default subtitle language">
          <select
            value={local.subtitleLang}
            onChange={(e) => update('subtitleLang', e.target.value)}
            className="w-full h-8 rounded-md bg-[#0a0a0a] border border-[#242424] text-neutral-300 text-xs px-3 focus:outline-none focus:ring-1 focus:ring-rose-500/40"
          >
            {LANG_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#141414]">{o.label}</option>
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
              className="flex-1 accent-rose-500"
            />
            <span className="text-sm font-semibold text-neutral-300 w-4 text-center tabular-nums">
              {local.concurrentDownloads}
            </span>
          </div>
        </Field>

        <Field label="Download speed limit" hint='e.g. "5M" or "500K" — leave blank for unlimited'>
          <Input
            value={local.rateLimit}
            onChange={(e) => update('rateLimit', e.target.value)}
            placeholder="5M"
            className="h-8 bg-[#0a0a0a] border-[#242424] text-neutral-300 text-xs focus-visible:ring-rose-500/30"
          />
        </Field>

        <Field label="Proxy" hint="HTTP/SOCKS — e.g. socks5://127.0.0.1:1080">
          <Input
            value={local.proxy}
            onChange={(e) => update('proxy', e.target.value)}
            placeholder="http://proxy:port"
            className="h-8 bg-[#0a0a0a] border-[#242424] text-neutral-300 text-xs focus-visible:ring-rose-500/30"
          />
        </Field>

        <Field label="Cookie file" hint="For content that requires login">
          <div className="flex gap-2">
            <Input
              value={local.cookieFile}
              readOnly
              placeholder="Not selected"
              className="bg-[#0a0a0a] border-[#242424] text-neutral-400 text-xs h-8 min-w-0"
            />
            <Button
              variant="outline"
              onClick={handleBrowseCookie}
              className="h-8 px-3 bg-[#0a0a0a] border-[#242424] hover:bg-[#1a1a1a] text-neutral-400 text-xs shrink-0"
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>
            {local.cookieFile && (
              <Button
                variant="outline"
                onClick={() => update('cookieFile', '')}
                className="h-8 px-3 bg-[#0a0a0a] border-[#242424] hover:bg-[#1a1a1a] text-neutral-500 text-xs shrink-0"
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
                : 'bg-[#1a1a1a] border border-[#242424]'
            )}>
              <Cpu className={cn('h-4 w-4', ffmpegAvailable ? 'text-emerald-400' : 'text-neutral-500')} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-300">FFmpeg</span>
                {ffmpegAvailable ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-1.5 py-0.5 rounded">
                    <CheckCircle className="h-2.5 w-2.5" /> Installed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-500 bg-[#1a1a1a] border border-[#242424] px-1.5 py-0.5 rounded">
                    <AlertCircle className="h-2.5 w-2.5" /> Not found
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 truncate">
                {ffmpegAvailable
                  ? (ffmpegSource === 'appdata' ? '%APPDATA%\\Fetchr\\bin\\' : ffmpegSource === 'bundled' ? 'Bundled' : 'System PATH')
                  : 'Required for merging, audio extraction, and subtitles'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onSetupFfmpeg}
            className="h-8 px-3 bg-[#0a0a0a] border-[#242424] hover:bg-[#1a1a1a] text-neutral-400 hover:text-neutral-200 text-xs shrink-0"
          >
            {ffmpegAvailable ? 'Re-install' : 'Install FFmpeg'}
          </Button>
        </div>
      </Section>

      {/* Browser Extension */}
      <Section title="Browser Extension">
        {/* Token */}
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <Puzzle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            <span className="text-sm text-neutral-300">Bridge token</span>
            <span className="text-xs text-neutral-500 ml-auto">Port {bridgePort}</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 font-mono text-xs bg-[#0a0a0a] border border-[#242424] rounded-md px-3 py-2 text-neutral-400 truncate select-all">
              {bridgeToken ?? 'Loading...'}
            </div>
            <Button
              variant="outline"
              onClick={handleCopyToken}
              disabled={!bridgeToken}
              title="Copy token"
              className="h-9 px-3 bg-[#0a0a0a] border-[#242424] hover:bg-[#1a1a1a] text-neutral-400 text-xs shrink-0"
            >
              {tokenCopied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="outline"
              onClick={onRegenerateToken}
              title="Generate new token (extension must be reconfigured)"
              className="h-9 px-3 bg-[#0a0a0a] border-[#242424] hover:bg-[#1a1a1a] text-neutral-400 text-xs shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-xs text-neutral-500">Copy this token and paste it into the Fetchr Companion extension popup.</p>
        </div>

        {/* Extension folder */}
        <div className="px-4 py-3 space-y-1.5 border-t border-[#242424]">
          <label className="text-sm text-neutral-300">Extension folder</label>
          <div className="flex gap-2">
            <div className="flex-1 text-xs bg-[#0a0a0a] border border-[#242424] rounded-md px-3 py-2 text-neutral-500 truncate">
              {extensionDir || 'Loading...'}
            </div>
            <Button
              variant="outline"
              onClick={onOpenExtensionFolder}
              disabled={!extensionDir}
              className="h-9 px-3 bg-[#0a0a0a] border-[#242424] hover:bg-[#1a1a1a] text-neutral-400 text-xs shrink-0"
            >
              <FolderOpen className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Install guide */}
        <div className="px-4 py-3 space-y-3 border-t border-[#242424]">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setExtGuideTab('chromium')}
              className={cn('text-xs px-3 py-1 rounded-md transition-colors', extGuideTab === 'chromium' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-500 hover:text-neutral-300')}
            >
              Chrome / Edge / Brave
            </button>
            <button
              onClick={() => setExtGuideTab('firefox')}
              className={cn('text-xs px-3 py-1 rounded-md transition-colors', extGuideTab === 'firefox' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-500 hover:text-neutral-300')}
            >
              Firefox
            </button>
          </div>

          {extGuideTab === 'chromium' && (
            <ol className="space-y-1.5 text-xs text-neutral-400 list-none">
              {[
                'Open chrome://extensions (or edge://extensions)',
                'Enable Developer Mode — toggle in the top-right corner',
                'Click "Load unpacked"',
                'Select the extension folder shown above',
                'Paste the bridge token into the extension popup',
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-neutral-800 text-neutral-500 text-[10px] flex items-center justify-center shrink-0 mt-px">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}

          {extGuideTab === 'firefox' && (
            <ol className="space-y-1.5 text-xs text-neutral-400 list-none">
              {[
                'Locate fetchr-companion-firefox.xpi in the extension folder',
                'Open Firefox → drag and drop the .xpi file onto any browser tab',
                'Click "Add" when Firefox prompts for permission',
                'Paste the bridge token into the extension popup',
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-neutral-800 text-neutral-500 text-[10px] flex items-center justify-center shrink-0 mt-px">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Section>

      {/* Spacer */}
      <div className="h-20" />

      {/* Save button — sticky bottom */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center gap-4 px-8 py-4 bg-[#0a0a0a]/90 backdrop-blur border-t border-[#242424] z-10">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-rose-500 hover:bg-rose-600 text-white text-sm px-6 h-9"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" />
            Saved successfully
          </span>
        )}
        <span className="text-xs text-neutral-700 ml-auto">Changes apply immediately after saving</span>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{title}</h2>
      <div className="bg-[#141414] border border-[#242424] rounded-xl divide-y divide-[#242424]">
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 space-y-1.5">
      <div className="flex items-baseline gap-2">
        <label className="text-sm text-neutral-300">{label}</label>
        {hint && <span className="text-xs text-neutral-500">{hint}</span>}
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
        <p className="text-sm text-neutral-300 group-hover:text-neutral-100 transition-colors">{label}</p>
        {description && <p className="text-xs text-neutral-500 mt-0.5">{description}</p>}
      </div>
      <div
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors shrink-0',
          checked ? 'bg-rose-500' : 'bg-neutral-700'
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
