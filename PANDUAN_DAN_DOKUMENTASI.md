# 📖 Panduan Pengoperasian & Dokumentasi Arsitektur Web "Catatan Harian" (Supabase)

Aplikasi **Catatan Harian** adalah web aplikasi multi-user modern berbasis **Next.js 14 (App Router)**, **Tailwind CSS**, **NextAuth.js**, dan database cloud **PostgreSQL (Supabase)**.

---

## 🌟 Fitur Utama

1. **Sistem Autentikasi Pengguna (Multi-User)**:
   - Registrasi akun baru dengan enkripsi password searah menggunakan **bcrypt** (salt 10 rounds).
   - Login aman dengan session berbasis JWT (Cookie HTTP-Only yang tahan serangan XSS).
   - Logout yang membersihkan sesi pengguna secara menyeluruh.
2. **Ruang Catatan Pribadi (Data Isolation)**:
   - Data catatan dikaitkan langsung dengan `user_id`. Pengguna hanya dapat membaca, menambah, mengubah, dan menghapus catatan miliknya sendiri.
   - Endpoint API dilindungi di sisi server (*Server-side Session Validation*).
3. **Route Guarding (Middleware)**:
   - Pengunjung yang belum login otomatis dialihkan (*redirect*) ke halaman `/login` jika mencoba mengakses dashboard `/`.
4. **Antarmuka Bersih & Modern (Tailwind CSS)**:
   - Tampilan responsif (smartphone, tablet, desktop).
   - Mode gelap & terang (*Dark/Light Mode*).
   - Progress bar pengerjaan catatan secara dinamis.
   - Filter cepat (**Semua**, **Aktif**, **Selesai**) dan kotak pencarian instan (*quick search*).
   - Edit judul catatan secara *inline* (klik pensil atau klik dua kali pada teks catatan).
5. **Koneksi Cloud Database (Supabase SDK)**:
   - Menggunakan client resmi `@supabase/supabase-js`.
   - Menggunakan `supabaseAdmin` (Service Role Key) di backend untuk integritas operasi query.

---

## 🚀 Panduan Pengoperasian

### 1. Konfigurasi Lingkungan (`.env`)
File `.env` sudah terisi dengan kredensial project Supabase kamu:
```env
NEXT_PUBLIC_SUPABASE_URL=https://vagwxjtieenpcqrjyutu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=97f2ad0f5d5f098db99e797ed8ec130ba59305792feb36f042e541b63230a33b
```

### 2. Memastikan Skema Tabel di SQL Editor Supabase
Jika belum menjalankan skrip SQL di dashboard Supabase:
1. Buka [Dashboard Supabase](https://supabase.com/dashboard/project/vagwxjtieenpcqrjyutu) $\rightarrow$ pilih **SQL Editor**.
2. Salin seluruh isi dari file [`database.sql`](file:///c:/Users/ADMIN/Desktop/webtodolist/database.sql).
3. Klik tombol **Run**.

### 3. Menjalankan Server Aplikasi
Jalankan perintah berikut di terminal:
```bash
npm run dev
```
Buka browser ke 👉 **http://localhost:3000**

---

## ☁️ Langkah Deployment ke Vercel (100% Gratis)

1. **Push ke GitHub**:
   Upload folder project ini ke repository GitHub pribadi kamu.
2. **Buka Vercel**:
   Kunjungi [vercel.com](https://vercel.com) dan login menggunakan akun GitHub.
3. **Import Project**:
   Pilih repository `webtodolist` yang baru kamu upload.
4. **Environment Variables**:
   Di halaman konfigurasi deploy Vercel, tambahkan variabel berikut (salin dari `.env`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`: Isi dengan URL domain Vercel kamu (misal: `https://catatan-harian.vercel.app`)
5. Klik **Deploy**! Web kamu langsung live online dan dapat diakses dari mana saja.
