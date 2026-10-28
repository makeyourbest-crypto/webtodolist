import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    /*
     * Lindungi dashboard utama dan API todos.
     * Biarkan /login, /register, dan NextAuth API tetap publik.
     */
    '/',
    '/api/todos/:path*',
  ],
};
