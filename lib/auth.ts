import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Login dengan password teks biasa (isi manual di Supabase) hanya diizinkan saat development,
 * atau jika ALLOW_PLAINTEXT_PASSWORDS=true di-set secara eksplisit. Di produksi default-nya MATI.
 */
const ALLOW_PLAINTEXT_PASSWORDS =
  process.env.NODE_ENV !== 'production' || process.env.ALLOW_PLAINTEXT_PASSWORDS === 'true';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 hari sesi aktif
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email dan password wajib diisi');
        }

        const email = credentials.email.toLowerCase().trim();

        // Cari user di tabel 'users' Supabase
        const { data: user, error } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (error || !user) {
          throw new Error('Email atau password tidak valid');
        }

        const inputPassword = credentials.password;
        const storedPassword = user.password;

        // Cek apakah storedPassword berupa hash bcrypt (format bcrypt selalu diawali $2a$, $2b$, atau $2y$)
        const isBcryptHash = storedPassword.startsWith('$2a$') || 
                             storedPassword.startsWith('$2b$') || 
                             storedPassword.startsWith('$2y$');

        let isValid = false;

        if (isBcryptHash) {
          // Kasus 1: Password normal ter-enkripsi
          isValid = await bcrypt.compare(inputPassword, storedPassword);
        } else if (ALLOW_PLAINTEXT_PASSWORDS) {
          // Kasus 2 (HANYA development / flag eksplisit): password diisi manual teks biasa di Supabase.
          // Dinonaktifkan di produksi karena siapa pun yang bisa menulis ke tabel users
          // dapat membuat akun dengan password teks biasa.
          isValid = inputPassword === storedPassword;

          // Jika cocok, langsung upgrade menjadi hash bcrypt
          if (isValid) {
            const newHash = await bcrypt.hash(inputPassword, 10);
            await supabaseAdmin
              .from('users')
              .update({ password: newHash })
              .eq('id', user.id);
          }
        }

        if (!isValid) {
          throw new Error('Email atau password tidak valid');
        }

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
