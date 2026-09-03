import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, Info, ArrowRight, ShieldCheck, Building2 } from 'lucide-react';
import Link from 'next/link';

import { ensureSystemCommissionsExist } from '@/app/actions/commissions-workspace';

export const dynamic = 'force-dynamic';

export default async function CommissionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  try {
    await ensureSystemCommissionsExist();
  } catch (e) {
    console.warn("ensureSystemCommissionsExist warning:", e);
  }

  // 1. Fetch all active commissions with leadership & members
  const { data: allComms } = await supabase
    .from('commissions')
    .select(`
      *,
      commission_membres (
        profile_id,
        role_commission,
        actif
      )
    `)
    .order('created_at', { ascending: false });

  // 2. Filter ONLY commissions where user is Responsable, Responsable Adjoint, or active Member
  const userAssignedComms = (allComms || []).filter((comm: any) => {
    const isResp = comm.responsable_id === user.id;
    const isAdj = comm.responsable_adjoint_id === user.id;
    const isMem = (comm.commission_membres || []).some(
      (m: any) => m.profile_id === user.id && m.actif !== false
    );
    return isResp || isAdj || isMem;
  }).map((comm: any) => {
    const isResp = comm.responsable_id === user.id;
    const isAdj = comm.responsable_adjoint_id === user.id;
    const memEntry = (comm.commission_membres || []).find((m: any) => m.profile_id === user.id && m.actif !== false);

    let userRole = 'Membre statutaire';
    if (isResp) userRole = 'Responsable Principal';
    else if (isAdj) userRole = 'Responsable Adjoint';
    else if (memEntry?.role_commission) userRole = memEntry.role_commission;

    return {
      ...comm,
      userRole,
    };
  });

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
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Mes Commissions</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Consultez vos espaces de travail dédiés et accédez aux réunions, tâches et documents des commissions dans lesquelles vous êtes affecté(e).
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: Commissions Affectées */}
      {userAssignedComms.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-extrabold text-slate-900">Vos Commissions Affectées ({userAssignedComms.length})</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userAssignedComms.map((comm: any) => (
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
                        {comm.userRole}
                      </span>
                    </div>
                    <div className="flex justify-end pt-2 text-xs font-extrabold text-blue-900 items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Ouvrir l&apos;espace de travail <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Info className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-slate-900">Aucune commission affectée</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Vous n&apos;êtes actuellement affecté(e) à aucune commission. Pour être ajouté(e) à un organe de travail de Synergie UQO, veuillez contacter un responsable ou les administrateurs du Conseil d&apos;Administration.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
