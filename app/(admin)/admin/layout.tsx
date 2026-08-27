import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LayoutDashboard, UserCheck, Users, FileText, Home, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    .select('prenom, nom, role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin_ca', 'tresorier', 'superadmin'].includes(profile.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
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
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-blue-900 transition-colors text-sm font-semibold"
            >
              <LayoutDashboard className="w-5 h-5 text-amber-500" />
              Vue d'ensemble
            </Link>
            <Link
              href="/admin/adhesions"
              className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-blue-900 transition-colors text-sm font-semibold"
            >
              <UserCheck className="w-5 h-5 text-amber-500" />
              Adhésions en attente
            </Link>
            <Link
              href="/admin/membres"
              className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-blue-900 transition-colors text-sm font-semibold"
            >
              <Users className="w-5 h-5 text-amber-500" />
              Annuaire & Export
            </Link>
            <Link
              href="/admin/articles"
              className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-blue-900 transition-colors text-sm font-semibold"
            >
              <FileText className="w-5 h-5 text-amber-500" />
              Gestion Blog
            </Link>
          </nav>
        </div>

        <div className="space-y-4 border-t border-blue-900 pt-6">
          <div className="text-sm">
            Connecté : <span className="font-semibold">{profile.prenom} {profile.nom}</span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2 rounded-md hover:bg-blue-900 transition-colors text-sm text-slate-300"
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
          <Link href="/" className="text-xl font-extrabold text-blue-950 md:hidden">
            Synergie <span className="text-amber-500">UQO</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 hidden sm:inline">
              Administrateur : <strong>{profile.prenom} {profile.nom}</strong>
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
