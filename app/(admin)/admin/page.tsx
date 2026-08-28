import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Users, FileClock, DollarSign, ArrowRight, ShieldCheck, Landmark, FileText } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const supabase = createClient();

  // Nombre de membres approuvés
  const { count: totalMembers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('statut_adhesion', 'approuve');

  // Candidatures en attente de révision
  const { count: pendingMembers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('statut_adhesion', 'en_attente_approbation');

  // Revenus Stripe collectés
  const { data: paiements } = await supabase
    .from('paiements')
    .select('montant')
    .eq('statut', 'paid');

  const totalRevenue = paiements?.reduce((sum, item) => sum + Number(item.montant), 0) || 0;

  // Récupérer les 3 dernières adhésions en attente
  const { data: recentPending } = await supabase
    .from('profiles')
    .select('id, prenom, nom, email, categorie, created_at')
    .eq('statut_adhesion', 'en_attente_approbation')
    .order('created_at', { ascending: false })
    .limit(3);

  const { data: activeCommissions } = await supabase
    .from('commissions')
    .select('id, nom, description, date_creation')
    .eq('statut', 'active')
    .order('created_at', { ascending: false })
    .limit(3);

  // Nombre d'articles de blog publiés
  const { count: totalArticles } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })
    .eq('est_publie', true);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 space-y-2">
          <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5 w-fit">
            <ShieldCheck className="w-3.5 h-3.5" /> Espace Administration
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Vue d&apos;ensemble</h1>
          <p className="text-blue-200/80 text-sm max-w-xl">
            Pilotez les adhésions, gérez les commissions de travail et suivez l&apos;activité de Synergie UQO.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="shadow-md border border-slate-100 rounded-2xl overflow-hidden bg-white hover:shadow-lg transition-shadow flex flex-col justify-between h-36">
          <div className="h-1 bg-blue-600" />
          <div className="p-5 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Membres Actifs</span>
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-700" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 leading-none">{totalMembers || 0}</div>
              <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Comptes en règle approuvés</p>
            </div>
          </div>
        </Card>

        <Card className="shadow-md border border-slate-100 rounded-2xl overflow-hidden bg-white hover:shadow-lg transition-shadow flex flex-col justify-between h-36">
          <div className="h-1 bg-amber-500" />
          <div className="p-5 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Adhésions en Attente</span>
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <FileClock className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-amber-650 leading-none">{pendingMembers || 0}</div>
              <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Candidatures à réviser</p>
            </div>
          </div>
        </Card>

        <Card className="shadow-md border border-slate-100 rounded-2xl overflow-hidden bg-white hover:shadow-lg transition-shadow flex flex-col justify-between h-36">
          <div className="h-1 bg-emerald-500" />
          <div className="p-5 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fonds Collectés</span>
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-emerald-700 leading-none">
                {totalRevenue.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}
              </div>
              <p className="text-[10px] text-slate-400 mt-2.5 font-medium">Cotisations perçues (Stripe)</p>
            </div>
          </div>
        </Card>

        <Card className="shadow-md border border-slate-100 rounded-2xl overflow-hidden bg-white hover:shadow-lg transition-shadow flex flex-col justify-between h-36">
          <div className="h-1 bg-violet-500" />
          <div className="p-5 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Articles Publiés</span>
              <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-violet-600" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-violet-700 leading-none">{totalArticles || 0}</div>
              <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Actualités en ligne</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Action Panels / Recent list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        
        {/* Adhésions en attente */}
        <Card className="border border-slate-100 shadow-md rounded-2xl bg-white overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between px-6 py-5">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileClock className="w-4 h-4 text-amber-500 animate-pulse" /> Demandes d&apos;adhésion récentes
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Candidatures en attente d&apos;examen par le CA
                </CardDescription>
              </div>
              <Link href="/admin/adhesions" className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors">
                Tout voir <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentPending && recentPending.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {recentPending.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-5 hover:bg-slate-50/40 transition-colors">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-slate-900">{member.prenom} {member.nom}</h4>
                        <p className="text-xs text-slate-500 font-medium">{member.email}</p>
                        <span className="inline-block bg-blue-50 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded-full capitalize mt-1.5 border border-blue-100">
                          {member.categorie.replace('_', ' ')}
                        </span>
                      </div>
                      <Link href={`/admin/membres/${member.id}`} className="text-xs font-bold bg-blue-950 hover:bg-blue-900 text-white py-1.5 px-3 rounded-lg shadow-sm">
                        Examiner
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center p-8">
                  <p className="text-sm text-slate-400 font-medium">Aucune demande en attente de validation.</p>
                </div>
              )}
            </CardContent>
          </div>
        </Card>

        {/* Commissions actives */}
        <Card className="border border-slate-100 shadow-md rounded-2xl bg-white overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between px-6 py-5">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-blue-600" /> Commissions de travail
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Commissions actives au sein de l&apos;association
                </CardDescription>
              </div>
              <Link href="/admin/commissions" className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors">
                Gérer <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {activeCommissions && activeCommissions.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {activeCommissions.map((comm) => (
                    <div key={comm.id} className="p-5 hover:bg-slate-50/40 transition-colors flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900">{comm.nom}</h4>
                        <p className="text-xs text-slate-550 line-clamp-1 max-w-sm">{comm.description || 'Aucune description'}</p>
                      </div>
                      <Link href={`/admin/commissions`} className="text-xs font-bold bg-blue-950 hover:bg-blue-900 text-white py-1.5 px-3 rounded-lg shadow-sm">
                        Gérer
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center p-8">
                  <p className="text-sm text-slate-400 font-medium">Aucune commission active.</p>
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
}
