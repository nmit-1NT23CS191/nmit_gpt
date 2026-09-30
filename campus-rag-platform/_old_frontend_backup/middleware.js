import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

/**
 * Edge middleware — runs before every request.
 *
 * Responsibilities:
 * 1. Refresh the Supabase session cookie so tokens stay alive.
 * 2. Guard /admin/* — unauthenticated users are redirected to /login?next=<path>.
 *
 * Role verification (student vs admin) is done in app/admin/layout.jsx
 * (a Server Component with full DB access) rather than here, because the
 * Edge runtime cannot make arbitrary Supabase DB queries efficiently.
 */
export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — MUST be called before any auth check.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect every route under /admin
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all paths EXCEPT:
     * - _next/static  (built assets)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - public files with an extension (e.g. .png, .svg)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
