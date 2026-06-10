import { useEffect, useState } from 'react';

export interface AppSettings {
  outputDir: string;
  defaultFormat: string;
  subtitleLang: string;
  embedSubs: boolean;
  startMinimized: boolean;
  concurrentDownloads: number;
  rateLimit: string;
  proxy: string;
  cookieFile: string;
  notify: {
    onComplete: boolean;
    onError: boolean;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  outputDir: '',
  defaultFormat: 'best',
  subtitleLang: 'en',
  embedSubs: true,
  startMinimized: false,
  concurrentDownloads: 3,
  rateLimit: '',
  proxy: '',
  cookieFile: '',
  notify: { onComplete: true, onError: true },
};

export interface PyApiInterface {
    check_system_status: () => Promise<{
        ffmpeg: { available: boolean; source: string | null; ffmpeg_path: string | null };
        js_runtime: { available: boolean; name: string | null; path: string | null };
        default_dir: string;
    }>;
    select_folder: () => Promise<string | null>;
    get_video_info: (url: string) => Promise<{
        success: boolean;
        error?: string;
        title?: string;
        thumbnail?: string;
        duration?: string;
        uploader?: string;
        formats?: Array<{ id: string; label: string; ext: string; size: string }>;
        subtitles?: Array<{ code: string; name: string; auto: boolean }>;
    }>;
    start_download: (url: string, formatId: string, outputPath: string, subtitleLang?: string | null, embedSubs?: boolean) => Promise<{
        success: boolean;
        download_id?: string;
        error?: string;
    }>;
    cancel_download: (downloadId: string) => Promise<{ success: boolean }>;
    pause_download: (downloadId: string) => Promise<{ success: boolean }>;
    get_download_history: () => Promise<Array<{
        title: string;
        url: string;
        format: string;
        date: string;
        folder: string;
        filename: string;
    }>>;
    add_to_history: (title: string, url: string, formatLabel: string, outputDir: string, filename: string) => Promise<boolean>;
    open_folder: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
    play_video: (folderPath: string, filename: string) => Promise<{ success: boolean; error?: string }>;
    delete_history_item: (index: number, deleteFile: boolean) => Promise<{ success: boolean; error?: string }>;
    check_for_update: () => Promise<{
        success: boolean;
        has_update: boolean;
        current_version?: string;
        latest_version?: string;
        release_name?: string;
        release_url?: string;
        error?: string;
    }>;
    open_url: (url: string) => Promise<{ success: boolean; error?: string }>;
    select_file: (fileTypes?: string[]) => Promise<string | null>;
    download_ffmpeg: () => Promise<{ success: boolean; error?: string }>;
    get_settings: () => Promise<AppSettings>;
    save_settings: (settings: AppSettings) => Promise<{ success: boolean; error?: string }>;
    get_bridge_token: () => Promise<string>;
    regenerate_bridge_token: () => Promise<{ success: boolean; token: string }>;
    get_bridge_port: () => Promise<number>;
    get_extension_dir: () => Promise<string>;
    get_playlist_info: (url: string) => Promise<{
        success: boolean;
        error?: string;
        title?: string;
        uploader?: string;
        count?: number;
        entries?: Array<{ index: number; id: string; title: string; url: string; duration: string }>;
    }>;
}

export function usePyApi() {
    const [api, setApi] = useState<PyApiInterface | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Cek jika API sudah disuntikkan secara instan
        const pywebview = (window as any).pywebview;
        if (pywebview && pywebview.api) {
            setApi(pywebview.api);
            setIsReady(true);
            return;
        }

        // Dengarkan event jika pywebview sedang diinisialisasi
        const handleReady = () => {
            if ((window as any).pywebview && (window as any).pywebview.api) {
                setApi((window as any).pywebview.api);
                setIsReady(true);
            }
        };

        window.addEventListener('pywebviewready', handleReady);
        return () => window.removeEventListener('pywebviewready', handleReady);
    }, []);

    return { api, isReady };
}
