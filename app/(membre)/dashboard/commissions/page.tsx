import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, Info, ArrowRight, ShieldCheck, Sparkles, Building2 } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CommissionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Fetch user membership in commissions
  const { data: userCommissions } = await supabase
    .from('commission_membres')
    .select(`
      role_commission,
      commissions (
        id,
        nom,
        description,
        objectifs,
        statut,
        est_systeme,
        code_systeme
      )
    `)
    .eq('profile_id', user.id)
    .eq('actif', true);

  // 2. Fetch all system commissions for display
  const { data: systemCommissions } = await supabase
    .from('commissions')
    .select('*')
    .eq('statut', 'active')
    .order('est_systeme', { ascending: false });

  const joinedCommissionIds = new Set(
    (userCommissions || []).map((uc: any) =>
      Array.isArray(uc.commissions) ? uc.commissions[0]?.id : uc.commissions?.id
    ).filter(Boolean)
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-500 absolute top-0 left-0 right-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 text-blue-900 rounded-2xl">
                <Building2 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Commissions & Organes de Travail</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Découvrez les 4 commissions système permanentes de Synergie UQO et accédez à vos espaces de travail dédiés.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: Vos Commissions Affectées */}
      {userCommissions && userCommissions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-extrabold text-slate-900">Vos Commissions Affectées</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userCommissions.map((uc: any) => {
              const comm = uc.commissions;
              if (!comm) return null;
              return (
                <Link key={comm.id} href={`/dashboard/commissions/${comm.id}`} className="block group">
                  <Card className="shadow-md hover:shadow-xl transition-all border border-slate-200/80 rounded-3xl bg-white overflow-hidden flex flex-col justify-between h-full group-hover:border-blue-900">
                    <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <CardTitle className="text-base font-extrabold text-slate-900 leading-snug group-hover:text-blue-900 transition-colors">
                          {comm.nom}
                        </CardTitle>
                        {comm.est_systeme && (
                          <span className="text-[10px] bg-blue-100 text-blue-900 font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider shrink-0">
                            Système
                          </span>
                        )}
                      </div>
                      <CardDescription className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {comm.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                          Votre Rôle Désigné
                        </span>
                        <span className="inline-block bg-blue-50 text-blue-900 border border-blue-200 px-3 py-1 rounded-xl text-xs font-extrabold">
                          {uc.role_commission || 'Membre statutaire'}
                        </span>
                      </div>
                      <div className="flex justify-end pt-2 text-xs font-extrabold text-blue-900 items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Ouvrir l&apos;espace de travail <ArrowRight className="w-4 h-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: Répertoire Général des Commissions Permanentes du Réseau */}
      <div className="space-y-4 pt-4 border-t border-slate-200/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-900" />
            <h2 className="text-lg font-extrabold text-slate-900">Commissions Permanentes du Réseau</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">Synergie UQO</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {(systemCommissions || []).map((comm: any) => {
            const isJoined = joinedCommissionIds.has(comm.id);
            return (
              <Link key={comm.id} href={`/dashboard/commissions/${comm.id}`} className="block group">
                <Card className="shadow-md hover:shadow-xl transition-all border border-slate-200/80 rounded-3xl bg-white overflow-hidden flex flex-col justify-between h-full group-hover:border-blue-900">
                  <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <CardTitle className="text-lg font-extrabold text-slate-900 leading-snug group-hover:text-blue-900 transition-colors">
                        {comm.nom}
                      </CardTitle>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {comm.est_systeme && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-200 uppercase tracking-wider">
                            Permanente
                          </span>
                        )}
                        {isJoined && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-900 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                            Membre
                          </span>
                        )}
                      </div>
                    </div>
                    <CardDescription className="text-xs text-slate-600 leading-relaxed">
                      {comm.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {comm.objectifs && (
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                          Mandat Statutaire
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 font-medium">
                          {comm.objectifs}
                        </p>
                      </div>
                    )}
                    <div className="flex justify-end pt-2 text-xs font-extrabold text-blue-900 items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Accéder au Hub de la commission <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
