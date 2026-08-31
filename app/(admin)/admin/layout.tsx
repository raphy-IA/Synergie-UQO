import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LayoutDashboard, UserCheck, Users, FileText, Home, LogOut, CheckSquare, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MobileSidebar from '@/components/shared/MobileSidebar';
import HeaderProfileDropdown from '@/components/shared/HeaderProfileDropdown';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('prenom, nom, role, avatar_url, statut_adhesion')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin_ca', 'tresorier', 'superadmin'].includes(profile.role)) {
    redirect('/dashboard');
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

  const links = [
    { href: '/admin', label: "Vue d'ensemble", icon: <LayoutDashboard className="w-5 h-5 text-amber-500" /> },
    (isSuperadmin || isPresident || isSec || isTres) && { href: '/admin/adhesions', label: 'Adhésions en attente', icon: <UserCheck className="w-5 h-5 text-amber-500" /> },
    (isSuperadmin || isPresident || isTres) && { href: '/admin/membres', label: 'Annuaire & Export', icon: <Users className="w-5 h-5 text-amber-500" /> },
    (isSuperadmin || isPresident || isComm) && { href: '/admin/articles', label: 'Gestion Blog', icon: <FileText className="w-5 h-5 text-amber-500" /> },
    (isSuperadmin || isPresident || isSec) && { href: '/admin/commissions', label: 'Commissions', icon: <Users className="w-5 h-5 text-amber-500" /> },
    (isSuperadmin || isPresident || isComm || isPart) && { href: '/admin/partenaires', label: 'Partenaires', icon: <Users className="w-5 h-5 text-amber-500" /> },
    (isSuperadmin || isPresident || isSec) && { href: '/admin/evenements', label: 'Événements', icon: <LayoutDashboard className="w-5 h-5 text-amber-500" /> },
    (isSuperadmin || isPresident || isSec) && { href: '/admin/votes', label: 'Votes & Sondages', icon: <FileText className="w-5 h-5 text-amber-500" /> },
    (isSuperadmin || isPresident || isSec) && { href: '/admin/taches', label: 'Attribution Tâches', icon: <CheckSquare className="w-5 h-5 text-amber-500" /> },
    (isSuperadmin || isPresident || isTres || isSec) && { href: '/admin/configuration', label: 'Configuration & Organes', icon: <Settings className="w-5 h-5 text-amber-500" /> },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar (desktop) */}
      <aside className="w-64 bg-blue-950 text-white flex flex-col justify-between p-6 shadow-xl hidden md:flex">
        <div className="space-y-8">
          <div>
            <Link href="/" className="text-2xl font-extrabold tracking-tight">
              Synergie <span className="text-amber-500">UQO</span>
            </Link>
            <div className="mt-2 text-xs text-blue-300 font-medium uppercase tracking-wider">
              Administration CA ({profile.role.replace('_', ' ')})
            </div>
          </div>

          <nav className="space-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-blue-900 transition-colors text-sm font-semibold"
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="space-y-4 border-t border-blue-900 pt-6">
          <Link href="/" className="flex items-center gap-3 px-4 py-2 rounded-md hover:bg-blue-900 transition-colors text-sm text-slate-300">
            <Home className="w-4 h-4" />
            Retour au site public
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 md:hidden">
            <MobileSidebar
              title={<span>Synergie <span className="text-amber-500">UQO</span></span>}
              subtitle={`Administration CA (${profile.role.replace('_', ' ')})`}
              links={links}
              extras={
                <>
                  <Link href="/dashboard" className="block w-full text-center bg-amber-500 hover:bg-amber-600 text-blue-950 font-bold py-2 px-4 rounded text-sm transition-colors">
                    Espace Membre
                  </Link>
                  <Link href="/" className="flex items-center gap-3 px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm text-slate-300">
                    <Home className="w-4 h-4" /> Retour au site public
                  </Link>
                </>
              }
            />
          </div>
          <Link href="/" className="text-xl font-extrabold text-blue-950 md:hidden">
            Synergie <span className="text-amber-500">UQO</span>
          </Link>
          <div className="flex items-center gap-4 ml-auto">
            <HeaderProfileDropdown profile={profile} isAdminSpace={true} />
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
