import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
    const rawPassword = typeof password === 'string' ? password : '';

    // Validasi input
    if (!trimmedName || !trimmedEmail || !rawPassword) {
      return NextResponse.json(
        { success: false, error: 'Semua kolom wajib diisi' },
        { status: 400 }
      );
    }

    if (trimmedName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Nama minimal 2 karakter' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    if (rawPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password minimal 6 karakter' },
        { status: 400 }
      );
    }

    // Cek apakah email sudah terdaftar di Supabase
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', trimmedEmail)
      .maybeSingle();

    if (checkError) {
      console.error('Supabase check error:', checkError);
      return NextResponse.json(
        { success: false, error: 'Gagal memeriksa ketersediaan email. Pastikan tabel "users" sudah dibuat di Supabase.' },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email sudah terdaftar. Silakan gunakan email lain atau login.' },
        { status: 409 }
      );
    }

    // Hash password secara aman dengan bcrypt
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Simpan user baru ke tabel users Supabase
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          name: trimmedName,
          email: trimmedEmail,
          password: hashedPassword,
        },
      ])
      .select('id')
      .single();

    if (insertError) {
      console.error('Supabase insert user error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Gagal membuat akun. Silakan coba lagi.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Registrasi berhasil! Silakan login.',
        userId: newUser.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan pada server saat mendaftarkan akun.',
      },
      { status: 500 }
    );
  }
}
