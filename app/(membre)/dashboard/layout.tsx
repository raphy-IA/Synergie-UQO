import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CreditCard, Home, LogOut, User, LayoutDashboard, Lock, Users, FileText, CheckSquare, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MobileSidebar from '@/components/shared/MobileSidebar';
import HeaderProfileDropdown from '@/components/shared/HeaderProfileDropdown';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardLayout({
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

  if (!profile) {
    redirect('/login');
  }

  const isAdmin = ['admin_ca', 'tresorier', 'superadmin'].includes(profile.role);
  const isApproved = ['approuve', 'en_attente_paiement'].includes(profile.statut_adhesion);

  const links = isApproved ? [
    { href: '/dashboard', label: "Vue d'ensemble", icon: <LayoutDashboard className="w-5 h-5 text-amber-500" /> },
    { href: '/dashboard/profil', label: 'Mon Profil', icon: <User className="w-5 h-5 text-amber-500" /> },
    { href: '/dashboard/calendrier', label: 'Calendrier', icon: <Calendar className="w-5 h-5 text-amber-500" /> },
    { href: '/dashboard/cotisations', label: 'Historique & Reçus', icon: <CreditCard className="w-5 h-5 text-amber-500" /> },
    { href: '/dashboard/commissions', label: 'Mes Commissions', icon: <Users className="w-5 h-5 text-amber-500" /> },
    { href: '/dashboard/evenements', label: 'Mes Événements', icon: <CreditCard className="w-5 h-5 text-amber-500" /> },
    { href: '/dashboard/taches', label: 'Mes Tâches', icon: <CheckSquare className="w-5 h-5 text-amber-500" /> },
    { href: '/dashboard/messages', label: 'Messagerie', icon: <LayoutDashboard className="w-5 h-5 text-amber-500" /> },
    { href: '/dashboard/forum', label: 'Forums', icon: <Users className="w-5 h-5 text-amber-500" /> },
    { href: '/dashboard/documents', label: 'Documents', icon: <FileText className="w-5 h-5 text-amber-500" /> },
    { href: '/dashboard/votes', label: 'Espace Votes', icon: <User className="w-5 h-5 text-amber-500" /> },
  ] : [
    { href: '/dashboard', label: "Vue d'ensemble", icon: <LayoutDashboard className="w-5 h-5 text-amber-500" /> },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar (desktop) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between p-6 shadow-lg hidden md:flex">
        <div className="space-y-8">
          <div>
            <Link href="/" className="text-2xl font-extrabold tracking-tight">
              Synergie <span className="text-amber-500">UQO</span>
            </Link>
            <div className="mt-2 text-xs text-slate-400 font-medium uppercase tracking-wider">
              Espace Membre Privé
            </div>
          </div>

          <nav className="space-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-slate-800 transition-colors text-sm font-semibold"
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="space-y-4 border-t border-slate-800 pt-6">
          <Link href="/" className="flex items-center gap-3 px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm text-slate-300">
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
              subtitle="Espace Membre Privé"
              links={links}
              extras={
                <>
                  <div className="text-sm">
                    Membre : <span className="font-semibold">{profile.prenom} {profile.nom}</span>
                  </div>
                  {isAdmin && (
                    <Link href="/admin" onClick={undefined} className="block w-full text-center bg-blue-900 hover:bg-blue-950 text-white font-bold py-2 px-4 rounded text-sm transition-colors">
                      Espace Admin
                    </Link>
                  )}
                  <Link href="/" className="flex items-center gap-3 px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm text-slate-300">
                    <Home className="w-4 h-4" /> Retour au site public
                  </Link>
                </>
              }
            />
          </div>
          <Link href="/" className="text-xl font-extrabold text-slate-900 md:hidden">
            Synergie <span className="text-amber-500">UQO</span>
          </Link>
          <div className="flex items-center gap-4 ml-auto">
            <HeaderProfileDropdown profile={profile} isAdminSpace={false} />
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
