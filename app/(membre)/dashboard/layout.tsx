import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CreditCard, Home, LogOut, User, LayoutDashboard, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    .select('prenom, nom, role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
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
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-slate-800 transition-colors text-sm font-semibold"
            >
              <LayoutDashboard className="w-5 h-5 text-amber-500" />
              Vue d'ensemble
            </Link>
            <Link
              href="/dashboard/profil"
              className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-slate-800 transition-colors text-sm font-semibold"
            >
              <User className="w-5 h-5 text-amber-500" />
              Modifier mon profil
            </Link>
            <Link
              href="/dashboard/cotisations"
              className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-slate-800 transition-colors text-sm font-semibold"
            >
              <CreditCard className="w-5 h-5 text-amber-500" />
              Historique & Reçus
            </Link>
            <Link
              href="/dashboard/securite"
              className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-slate-800 transition-colors text-sm font-semibold"
            >
              <Lock className="w-5 h-5 text-amber-500" />
              Sécurité
            </Link>
            <Link
              href="/dashboard/commissions"
              className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-slate-800 transition-colors text-sm font-semibold"
            >
              <Users className="w-5 h-5 text-amber-500" />
              Mes Commissions
            </Link>
          </nav>
        </div>

        <div className="space-y-4 border-t border-slate-800 pt-6">
          <div className="text-sm">
            Membre : <span className="font-semibold">{profile.prenom} {profile.nom}</span>
          </div>
          {['admin_ca', 'tresorier', 'superadmin'].includes(profile.role) && (
            <Link
              href="/admin"
              className="block w-full text-center bg-blue-900 hover:bg-blue-950 text-white font-bold py-2 px-4 rounded text-sm transition-colors"
            >
              Aller vers l'admin CA
            </Link>
          )}
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm text-slate-300"
          >
            <Home className="w-4 h-4" />
            Retour au site public
          </Link>
          <form action="/api/auth/signout" method="POST">
            <Button
              type="submit"
              variant="destructive"
              className="w-full justify-start gap-3 bg-red-800 hover:bg-red-900 text-white"
            >
              <LogOut className="w-4 h-4" /> Deconnexion
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b p-4 flex items-center justify-between md:justify-end shadow-sm">
          <Link href="/" className="text-xl font-extrabold text-slate-900 md:hidden">
            Synergie <span className="text-amber-500">UQO</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              Bienvenue, <strong>{profile.prenom} {profile.nom}</strong>
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
