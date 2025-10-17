import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here if needed
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Public routes that don't require authentication
        if (pathname === '/login' || pathname === '/register') {
          return true
        }

        // All other routes require authentication
        if (!token) {
          return false
        }

        // Role-based access control
        const userRole = token.role

        // SuperAdmin can access everything
        if (userRole === 'SUPERADMIN') {
          return true
        }

        // Admin can access admin routes and user routes
        if (userRole === 'ADMIN') {
          if (pathname.startsWith('/superadmin')) {
            return false // Admin cannot access superadmin routes
          }
          return true
        }

        // Regular users can only access user routes
        if (userRole === 'USER') {
          if (pathname.startsWith('/admin') || pathname.startsWith('/superadmin')) {
            return false // Users cannot access admin or superadmin routes
          }
          return true
        }

        return false
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
