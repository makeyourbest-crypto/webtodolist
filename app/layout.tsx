import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Catatan harian',
  description: 'Aplikasi Catatan Harian modern dan responsif dengan Next.js, Tailwind CSS, dan database cloud Supabase.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-800 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
