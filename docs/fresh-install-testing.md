# Fresh Install Testing — Fetchr

Panduan simulasi instalasi pertama kali di device baru, menggunakan laptop yang sama.

---

## 1. Bersihkan State Lama

### Uninstall app
Control Panel → Programs → Uninstall a Program → hapus **Fetchr**

### Hapus data AppData
Buka File Explorer, ketik di address bar, lalu hapus seluruh foldernya:
```
%APPDATA%\Fetchr\
```
Folder ini berisi: settings, token, download history, dan FFmpeg yang sudah didownload sebelumnya.

### Bersihkan registry protocol handler
1. `Win+R` → ketik `regedit` → Enter
2. Navigasi ke: `HKEY_CURRENT_USER\Software\Classes\fetchr`
3. Klik kanan → Delete

### Clear Windows icon cache
Agar icon lama tidak tersisa di taskbar/shortcut:
```cmd
taskkill /f /im explorer.exe
del /f /q "%localappdata%\IconCache.db"
start explorer.exe
```

---

## 2. Install Fresh

Jalankan `Fetchr-setup.exe` → ikuti wizard installer.

---

## 3. Checklist Verifikasi

| # | Yang Dicek | Ekspektasi |
|---|---|---|
| 1 | Icon di taskbar & system tray | Logo Fetchr (bukan kotak ungu polos) |
| 2 | Modal FFmpeg muncul saat pertama buka | Ya — karena `%APPDATA%\Fetchr\bin\` masih kosong |
| 3 | Klik "Download FFmpeg" | Progress bar berjalan, tidak ada SSL error |
| 4 | Setelah FFmpeg selesai | Modal hilang, app siap digunakan |
| 5 | Paste URL YouTube → klik Download | Otomatis pindah ke tab Queue |
| 6 | Extension browser (jika dipasang) | Tombol floating muncul di YouTube tanpa perlu reload |

---

## 4. Alternatif Tanpa Uninstall

| Metode | Kelebihan | Kekurangan |
|---|---|---|
| **Windows Sandbox** | Environment benar-benar bersih | Tidak persist, perlu Win 10/11 Pro |
| **User account Windows baru** | AppData kosong, akurat | Perlu logout/login |
| **Hapus `%APPDATA%\Fetchr\` saja** | Cepat, cukup untuk test sebagian besar skenario | State registry dan shortcut masih sisa |

> Cara paling cepat dan cukup akurat: hapus folder `%APPDATA%\Fetchr\` + uninstall + install ulang.

---

## Catatan

- Token bridge extension tersimpan di `%APPDATA%\Fetchr\token` — dihapus bersama folder Fetchr
- FFmpeg tidak ikut dalam installer (didownload on-demand) — ini yang pertama kali ditest
- Protocol handler `fetchr://` didaftarkan otomatis saat app pertama kali jalan (tidak perlu manual)
