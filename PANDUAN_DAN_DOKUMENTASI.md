# 📖 Panduan Pengoperasian & Dokumentasi Arsitektur Web "Catatan Harian"

Aplikasi **Catatan Harian** adalah web aplikasi multi-user modern berbasis **Next.js 14 (App Router)**, **Tailwind CSS**, **NextAuth.js**, dan database cloud **PostgreSQL (Supabase)**.

---

## 🌟 Fitur Utama

1. **Sistem Autentikasi Pengguna (Multi-User)**:
   - Registrasi akun baru dengan enkripsi password searah menggunakan **bcrypt** (salt 10 rounds).
   - Login aman dengan session berbasis JWT (Cookie HTTP-Only yang tahan serangan XSS).
   - Proteksi rute otomatis via `middleware.ts`: pengunjung dialihkan ke `/login`, dan pengguna yang sudah login dialihkan dari `/login`/`/register` langsung ke dashboard `/`.
2. **Ruang Catatan Pribadi (Data Isolation)**:
   - Data catatan dikaitkan langsung dengan `user_id`. Pengguna hanya dapat membaca, menambah, mengubah, dan menghapus catatan miliknya sendiri.
   - Endpoint API dilindungi di sisi server (*Server-side Session Validation*).
3. **Navigasi Tanggal Harian (Daily Logs)**:
   - Tombol ◀ dan ▶ serta tombol cepat "Hari Ini" untuk menjelajahi catatan hari-hari sebelumnya.
   - Pembuatan catatan baru dikhususkan untuk hari ini guna menjaga integritas jurnal harian.
4. **Kotak Sampah & Pemulihan (Soft Delete & Restore)**:
   - Menghapus catatan tidak langsung melenyapkannya dari database, melainkan dipindahkan ke tab **Sampah**.
   - Dari tab Sampah, pengguna dapat:
     - **Pulihkan (Restore ↺)**: Catatan kembali ke daftar aktif pada tanggal aslinya.
     - **Hapus Permanen (✕)**: Menghapus catatan secara permanen dengan konfirmasi.
     - **Kosongkan Sampah**: Membersihkan semua item di kotak sampah sekaligus.
5. **Panel Riwayat Produktivitas (30 Hari Terakhir)**:
   - Ikon jam riwayat di header menampilkan ringkasan catatan dan rasio penyelesaian dalam 30 hari terakhir.
   - Klik pada salah satu hari di riwayat untuk langsung membuka catatan pada tanggal tersebut.
6. **Performa Tinggi & Anti-Lemot**:
   - **Lazy Loading**: Data Sampah dan data Riwayat hanya ditarik dari Supabase saat tab/panelnya dibuka oleh user.
   - **Optimistic UI**: Aksi tambah, centang, hapus, dan pulihkan langsung terlihat dalam 0.01 detik tanpa jeda jaringan.
   - **Serverless Region Singapore (`sin1`)**: Latensi serverless function Vercel diatur satu kawasan dengan Supabase (`ap-southeast-1`).
7. **Antarmuka Bersih & Modern (Tailwind CSS)**:
   - Tampilan responsif (smartphone, tablet, desktop).
   - Mode gelap & terang (*Dark/Light Mode*).
   - Progress bar dinamis dan kotak pencarian instan (*quick search*).
   - Edit judul catatan secara *inline* (klik pensil atau klik dua kali pada teks catatan).

---

## 🚀 Panduan Pengoperasian

### 1. Konfigurasi Lingkungan (`.env`)
Salin `.env.example` menjadi `.env`, lalu isi dengan kredensial project Supabase kamu:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<string acak 32 karakter>
```

> **Keamanan:** File `.env` sudah masuk `.gitignore` dan **tidak boleh di-commit**. `SUPABASE_SERVICE_ROLE_KEY` melewati semua pembatasan akses database, jadi jangan pernah ditempel ke chat, dokumen, atau repository.

### 2. Skema Database di SQL Editor Supabase
Tabel dan indeks relasi dapat dibuat/dimigrasikan dengan menjalankan skrip SQL:
- Untuk instalasi baru: Gunakan file [`database.sql`](file:///c:/Users/ADMIN/Desktop/webtodolist/database.sql).
- Untuk database yang sudah ada: Gunakan file [`migrations/001_soft_delete_and_history.sql`](file:///c:/Users/ADMIN/Desktop/webtodolist/migrations/001_soft_delete_and_history.sql).

### 3. Menjalankan Server Lokal
```bash
npm run dev
```
Buka browser ke 👉 **http://localhost:3000**

---

## 🏗️ Struktur Arsitektur Kode

```text
webtodolist/
├── app/
│   ├── (auth)/                          # Route Group halaman autentikasi
│   │   ├── login/page.tsx               # UI Form Login (Client Component)
│   │   └── register/page.tsx            # UI Form Registrasi (Client Component)
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts   # Handler Auth Engine (NextAuth)
│   │   │   └── register/route.ts        # Endpoint POST registrasi user baru
│   │   └── todos/
│   │       ├── route.ts                 # GET (harian / sampah / riwayat), POST (tambah), DELETE (bersihkan / kosongkan)
│   │       └── [id]/
│   │           └── route.ts             # PUT (update / restore), DELETE (soft delete / permanent)
│   ├── globals.css                      # Directive Tailwind CSS
│   ├── layout.tsx                       # Root layout dengan SessionProvider wrapper
│   └── page.tsx                         # Dashboard utama Catatan Harian (Navigasi Hari, Sampah, Riwayat)
├── components/
│   └── Providers.tsx                    # NextAuth SessionProvider client wrapper
├── lib/
│   ├── auth.ts                          # Opsi konfigurasi NextAuth (JWT & Credentials Provider)
│   ├── supabase.ts                      # Client resmi Supabase SDK (Public & Admin Service Role)
│   └── todo-format.ts                   # Helper format data catatan, parsing ISO date, & query column presets
├── migrations/
│   └── 001_soft_delete_and_history.sql  # Skrip migrasi kolom is_deleted & indeks komposit
├── middleware.ts                        # Route Protection otomatis berbasis NextAuth token
├── database.sql                         # Skema referensi lengkap PostgreSQL untuk Supabase
├── vercel.json                          # Konfigurasi region Vercel (sin1 - Singapore)
└── .env.example                         # Template variabel lingkungan
```
