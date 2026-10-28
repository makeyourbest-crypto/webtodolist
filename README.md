# 🚀 Web Catatan Harian (Multi-User) — Supabase & PostgreSQL

Aplikasi Web **Catatan Harian** berbasis **Next.js 14**, didesain elegan dengan **Tailwind CSS**, terhubung ke cloud database **PostgreSQL (Supabase)**, dan dilengkapi sistem autentikasi multi-user aman menggunakan **NextAuth.js** dan **Bcrypt**.

---

## 🌟 Fitur Utama
- **Cloud Database (Supabase PostgreSQL)**: Data tersimpan permanen di cloud Supabase tanpa memerlukan XAMPP lokal.
- **Multi-User**: Setiap pengguna memiliki akun dan ruang catatan pribadi masing-masing yang terisolasi.
- **Keamanan Tinggi**: Password di-hash menggunakan `bcrypt`, session berbasis JWT HTTP-Only, dan proteksi rute via `middleware.ts`.
- **CRUD Lengkap**: Tambah catatan, coret/tandai selesai, edit judul secara inline, dan hapus.
- **Desain Modern & Responsif**: Mendukung Dark Mode & Light Mode, filter status (Semua/Aktif/Selesai), dan pencarian instan.
- **Siap Deploy ke Vercel**: Dapat langsung di-online-kan 100% gratis.

---

## ⚡ Cara Menjalankan di Lokal

1. **Pastikan tabel Supabase sudah dibuat**:
   Salin skrip dari file `database.sql` dan jalankan di **SQL Editor** pada dashboard Supabase Anda.

2. **Jalankan Server Development**:
   ```bash
   npm run dev
   ```

3. **Buka Aplikasi**:
   Akses [http://localhost:3000](http://localhost:3000) di browser Anda.

---

📖 **Dokumentasi Lengkap & Arsitektur Kode**: Silakan baca file [PANDUAN_DAN_DOKUMENTASI.md](file:///c:/Users/ADMIN/Desktop/webtodolist/PANDUAN_DAN_DOKUMENTASI.md).
