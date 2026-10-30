import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Jika user sudah login dan mencoba mengakses /login atau /register, alihkan ke dashboard (/)
    if (token && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Halaman login dan register boleh diakses tanpa token
        if (pathname === '/login' || pathname === '/register') {
          return true;
        }
        // Halaman dashboard dan API todos wajib punya token
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    /*
     * Lindungi dashboard utama, halaman auth, dan API todos.
     */
    '/',
    '/login',
    '/register',
    '/api/todos/:path*',
  ],
};
