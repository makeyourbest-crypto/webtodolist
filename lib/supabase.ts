import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Warning: Supabase URL atau Anon Key belum diset di file .env');
}

/**
 * Public client untuk penggunaan browser/frontend umum
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Admin/Server client menggunakan Service Role Key
 * Digunakan di API route backend untuk operasi database yang terpercaya
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
