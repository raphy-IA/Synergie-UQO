import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  console.log(`[Middleware] Request path: ${pathname}, User logged in: ${!!user}`);

  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isAdminRoute = pathname.startsWith('/admin');

  if (isDashboardRoute || isAdminRoute) {
    if (!user) {
      console.log(`[Middleware] Redirecting to /login because user is not authenticated`);
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(url);
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('role, statut_adhesion')
      .eq('id', user.id)
      .single();

    if (profileErr) {
      console.error(`[Middleware] Error fetching profile:`, profileErr);
    }

    if (!profile) {
      console.log(`[Middleware] Redirecting to /login because profile is missing for user ${user.id}`);
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    console.log(`[Middleware] User role: ${profile.role}, adhesion status: ${profile.statut_adhesion}`);

    // If membership is not approved or pending payment, restrict dashboard sub-routes
    const isApprovedOrPendingPayment = ['approuve', 'en_attente_paiement'].includes(profile.statut_adhesion);
    if (isDashboardRoute && pathname !== '/dashboard' && !isApprovedOrPendingPayment) {
      console.log(`[Middleware] Redirecting to /dashboard because membership status is restricted: ${profile.statut_adhesion}`);
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    if (isAdminRoute) {
      const allowedRoles = ['admin_ca', 'tresorier', 'superadmin'];
      if (!allowedRoles.includes(profile.role)) {
        console.log(`[Middleware] Redirecting to /dashboard because role ${profile.role} is not allowed on admin route`);
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }

      // Query specific post from bureau_gouvernance
      const { data: posts } = await supabase
        .from('bureau_gouvernance')
        .select('role_bureau')
        .eq('profile_id', user.id);

      const assignedRoles = (posts || []).map(p => p.role_bureau);
      const isSuperadmin = profile.role === 'superadmin';
      const isPresident = assignedRoles.includes('president') || assignedRoles.includes('vice_president');
      const isSec = assignedRoles.includes('secretaire');
      const isTres = assignedRoles.includes('tresorier');
      const isComm = assignedRoles.includes('responsable_comm');
      const isPart = assignedRoles.includes('responsable_partenariat');

      // Now match pathname with allowed posts
      if (!isSuperadmin && !isPresident) {
        if (pathname.startsWith('/admin/configuration') && !isTres && !isSec) {
          const url = request.nextUrl.clone();
          url.pathname = '/admin';
          return NextResponse.redirect(url);
        }
        if (pathname.startsWith('/admin/membres') && !isTres) {
          const url = request.nextUrl.clone();
          url.pathname = '/admin';
          return NextResponse.redirect(url);
        }
        if (pathname.startsWith('/admin/commissions') && !isSec) {
          const url = request.nextUrl.clone();
          url.pathname = '/admin';
          return NextResponse.redirect(url);
        }
        if (pathname.startsWith('/admin/evenements') && !isSec) {
          const url = request.nextUrl.clone();
          url.pathname = '/admin';
          return NextResponse.redirect(url);
        }
        if (pathname.startsWith('/admin/votes') && !isSec) {
          const url = request.nextUrl.clone();
          url.pathname = '/admin';
          return NextResponse.redirect(url);
        }
        if (pathname.startsWith('/admin/taches') && !isSec) {
          const url = request.nextUrl.clone();
          url.pathname = '/admin';
          return NextResponse.redirect(url);
        }
        if (pathname.startsWith('/admin/articles') && !isComm) {
          const url = request.nextUrl.clone();
          url.pathname = '/admin';
          return NextResponse.redirect(url);
        }
        if (pathname.startsWith('/admin/partenaires') && !isComm && !isPart) {
          const url = request.nextUrl.clone();
          url.pathname = '/admin';
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
