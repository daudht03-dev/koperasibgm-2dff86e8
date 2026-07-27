
## 1. Pencarian di Daftar Koordinat & Peta

Di `LandMapTab.tsx` tambahkan input pencarian di atas peta:
- Filter berdasarkan **kode petani** (mis. `PK1`, `BN6`) dan opsional **alamat rumah** / **kode lahan**.
- Marker di peta ikut ter-filter (yang tidak match disembunyikan; marker match di-highlight & map auto fit bounds ke hasil).
- Daftar Koordinat di area cetak juga mengikuti filter aktif, sehingga hasil PNG hanya berisi entri yang dicari.
- Tombol "Reset pencarian" untuk kembali menampilkan semua.

## 2. Legenda dengan Skala Peta & Data Terupdate

- Legenda diambil realtime dari `useVillagePrefixes()` (sudah dinamis), tapi ditambahkan **daftar semua prefix aktif** dengan warna badge, jumlah lahan per desa, dan status (organik/konvensional) yang up-to-date.
- Tambah **skala peta** (scale bar km/m) di pojok bawah legenda, dihitung dari zoom level Google Maps aktif dan diperbarui saat pan/zoom. Ikut tercetak di PNG.
- Tambah timestamp "Data diperbarui: <tanggal>" agar hasil cetak jelas versinya.

## 3. Portal Auditor Eksternal (Web Peta Khusus)

### 3.1 Role & Akses

- Tambah role baru `auditor` ke enum `app_role`.
- Admin (existing) mengelola auditor lewat halaman baru **`/admin/auditors`**:
  - Tambah auditor: input email + password sementara → admin membuatkan akun (via Edge Function `create-auditor` yang pakai service role, karena signup publik dinonaktifkan).
  - Nonaktifkan / reset password / hapus auditor.
  - Lihat **riwayat akses** (tabel `auditor_access_log`): waktu login, IP, user agent, halaman yang diakses.

### 3.2 Halaman Auditor

- Route `/auditor/login` — form email + password khusus auditor.
- Route `/auditor/map` (protected: role `auditor` **atau** `admin`) — satu-satunya halaman yang bisa diakses auditor. Semua route lain diblok oleh guard baru `AuditorRoute` yang redirect ke `/auditor/map`.
- Data yang ditampilkan: koordinat & alamat lahan, koordinat & alamat rumah petani, nama & kode petani. Kontak petani (no HP) **tidak** ditampilkan sesuai memori proyek.
- Data diambil via Edge Function `public-audit-map` (bearer JWT auditor) sehingga tidak perlu buka RLS `petani`/`lahan` ke publik.

### 3.3 Fitur Peta Auditor (mirip Google Maps)

Di komponen baru `AuditorMap.tsx` (Google Maps JS API):
- **Lokasi saya**: tombol geolocation → tampilkan marker biru + akurasi.
- **Rute ke titik**: klik marker lahan/rumah → panel detail dengan tombol "Rute dari lokasi saya" (pakai Routes API via Edge Function proxy `directions-route` untuk hindari CORS + jaga API key). Tampilkan polyline rute, jarak, estimasi waktu.
- **Pencarian** (kode petani / alamat) sama seperti tab admin.
- **Skala peta**, legenda, cluster, hybrid/satellite toggle — konsisten dengan admin.
- Tombol print/download **dinonaktifkan** untuk auditor (view-only) — sesuai kebutuhan audit, mereka lihat saja, tidak export batch.

### 3.4 Logging

- Setiap page hit `/auditor/*` memicu insert ke `auditor_access_log` (via Edge Function `log-auditor-access`, service role) dengan `user_id`, `path`, `ip`, `user_agent`, `accessed_at`.
- Admin bisa lihat log di `/admin/auditors` (tab Riwayat), dengan filter per auditor & rentang tanggal.

## Rincian Teknis

### Database (satu migrasi)
- `ALTER TYPE app_role ADD VALUE 'auditor'`.
- Table `public.auditor_access_log(id, user_id fk auth.users, path text, ip text, user_agent text, accessed_at timestamptz default now())` + GRANT + RLS: admin bisa SELECT semua; auditor tidak bisa read; service_role full.
- Kebijakan `has_role(uid,'auditor')` sudah otomatis didukung fungsi `has_role` existing.
- Tidak mengubah RLS tabel `petani`/`lahan` — auditor mengakses lewat Edge Function `public-audit-map` yang memvalidasi JWT + role `auditor`/`admin` lalu query pakai service role.

### Edge Functions
- `create-auditor` (admin-only): buat user Supabase + assign role `auditor`.
- `manage-auditor` (admin-only): disable/reset password/hapus.
- `public-audit-map` (auditor+admin): return `{ farmers: [...home+lands+koord+alamat...], prefixes }`.
- `directions-route` (auditor+admin): proxy Google Routes API `computeRoutes`.
- `log-auditor-access` (auditor+admin): insert log.

### Frontend
- Files baru: `src/pages/AuditorLogin.tsx`, `src/pages/AuditorMap.tsx`, `src/pages/AdminAuditors.tsx`, `src/components/AuditorMapView.tsx`, `src/components/AuditorRoute.tsx`, `src/components/MapScaleBar.tsx`, `src/hooks/use-auditor-access-log.tsx`.
- Update: `src/App.tsx` (routes), `src/components/LandMapTab.tsx` (search + scale bar + legend counts), `src/components/ProtectedRoute.tsx` (support role `auditor` block), `src/pages/AdminDashboard.tsx` (link ke Kelola Auditor).
- `AuditorRoute`: kalau role != `auditor`/`admin` → `/auditor/login`; kalau `auditor` mencoba akses `/admin/*` → force `/auditor/map`.

### Konfirmasi sebelum jalan
Rencana ini menyentuh 5 edge functions baru + 1 migrasi + role baru. Setujui untuk saya eksekusi, atau beri tahu bagian mana yang mau dipangkas dulu (mis. tunda routing / log dulu).
