# Sistem Role Multi-Level, Portal Auditor Lanjutan & Foto Lahan Ber-Watermark

Lima bagian besar. Saya usulkan dikerjakan bertahap dalam urutan di bawah, karena bagian 2 (role) mengubah cara semua halaman diproteksi dan menjadi fondasi bagian 1, 3, dan 4.

---

## Tahap A — Sistem Role (poin 2 & 4)

### Role baru
Menambah nilai pada tipe role: `developer`, `pengawas`, `staf_lapang` (sudah ada: `admin`, `auditor`, `user`).

| Role | Akses |
|---|---|
| Developer | Semua menu + Pengaturan Pengguna (buat/hapus akun, ubah role) |
| Admin | Semua menu kecuali Pengaturan Pengguna |
| Pengawas | Hanya: daftar petani, lahan, peta (baca saja) |
| Staf Lapang | Daftar petani + peta penuh (boleh update data petani, ambil koordinat lahan & rumah) |
| Auditor | Hanya portal peta audit (seperti sekarang) |

### Yang dibangun
- Migrasi database: tambah nilai enum role; tabel profil pengguna (nama, email) agar daftar user bisa ditampilkan; fungsi bantu pengecekan role.
- Halaman **Pengaturan Pengguna** (`/admin/users`, khusus Developer): daftar semua akun, buat akun baru dengan role apa pun, ubah role, reset password, hapus akun permanen.
- Backend function `manage-users` (developer-only) untuk operasi di atas.
- Akun Anda saat ini dipromosikan menjadi Developer.
- `ProtectedRoute` diubah dari `requireAdmin` menjadi berbasis daftar role, lalu diterapkan ke seluruh rute.
- Menu/sidebar dashboard menyembunyikan item yang tidak diizinkan per role.

### Login (poin 4)
- Halaman login utama menjadi pintu masuk semua role, dengan tombol **Masuk dengan Google** + email/password.
- Setelah login, pengguna diarahkan otomatis sesuai role (auditor → peta audit, pengawas → daftar petani, dll.).
- Akun Google baru tanpa role tidak mendapat akses apa pun sampai Developer memberi role.

---

## Tahap B — Peta Audit & Log Auditor (poin 1 & 3)

- **Unduh PDF** di peta audit: hasil pencarian/daftar petani + koordinat + ringkasan rute (asal, tujuan, jarak, waktu), lengkap dengan kop dan tanggal cetak.
- **Riwayat rute**: setiap pencarian rute disimpan (auditor, titik asal, tujuan/kode lahan, jarak, durasi, waktu) dan ditampilkan di panel riwayat pada halaman auditor.
- **Filter log akses** di `/admin/auditors`: pencarian nama/email auditor, kode petani/lahan yang diakses, dan rentang tanggal; plus ekspor.
- **Menu pratinjau akun auditor (poin 3)**: halaman khusus Developer untuk melihat apa yang dilihat auditor — daftar fitur auditor, statistik akses per akun, dan tombol "Lihat sebagai auditor" (buka portal peta audit dalam mode baca).

---

## Tahap C — Foto Lahan Ber-Watermark (poin 5)

Meniru gaya lampiran (GPS Map Camera):
- Tombol **Ambil Foto** pada peta (dan pada detail petani/lahan): buka kamera perangkat atau unggah dari galeri.
- Overlay otomatis di bagian bawah foto: peta mini lokasi, kecamatan/provinsi, alamat lengkap (hasil reverse geocoding), `Lat/Long`, catatan ("Lahan Petani" / "Alamat Petani"), **nama petani + kode petani** (untuk alamat rumah) atau **nama petani + kode lahan** (untuk lahan), dan logo perusahaan.
- Semua field overlay bisa diedit sebelum disimpan (termasuk memilih/mengganti petani terkait).
- Foto hasil komposit disimpan ke storage + tabel `foto_lahan` (relasi ke petani/lahan, koordinat, alamat, waktu).
- Galeri foto per petani/lahan dengan unduh satuan dan unduh massal (ZIP), serta ikut tampil di cetak peta.

---

## Catatan teknis

- Overlay foto dirender di canvas (bukan CSS) agar hasil unduhan identik dengan pratinjau.
- Peta mini pada overlay memakai Google Static Maps melalui gateway backend (kunci tidak diekspos).
- Bucket storage baru `foto-lahan` dengan aturan akses: tulis oleh staf lapang/admin/developer, baca sesuai role.
- Pengecekan role tetap memakai tabel `user_roles` terpisah + fungsi security definer (tidak menyimpan role di tabel profil).
- PDF dibuat di sisi klien (jsPDF + autoTable) mengikuti tema aplikasi.

Konfirmasi bila urutan tahap ini sesuai, atau bila ada bagian yang ingin didahulukan.
