import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function CommissionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userCommissions, error } = await supabase
    .from('commission_membres')
    .select(`
      role_commission,
      commissions (
        id,
        nom,
        description,
        objectifs,
        statut,
        date_creation
      )
    `)
    .eq('profile_id', user.id)
    .eq('actif', true);

  const hasCommissions = userCommissions && userCommissions.length > 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-500 absolute top-0 left-0 right-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 text-blue-900 rounded-2xl">
                <Users className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Mes Commissions Statutory</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Consultez les commissions associatives auxquelles vous êtes rattaché et vos responsabilités.
            </p>
          </div>
        </div>
      </div>

      {!hasCommissions ? (
        <Card className="bg-white border border-dashed border-slate-200 shadow-sm rounded-3xl p-12">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-3">
            <Info className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-base font-extrabold text-slate-800">Vous ne participez à aucune commission pour le moment.</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Lorsque vous serez désigné responsable ou membre actif d&apos;une commission par l&apos;administration, ses missions apparaîtront ici.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userCommissions.map((uc: any) => {
            const commission = uc.commissions;
            if (!commission) return null;
            return (
              <Card key={commission.id} className="shadow-lg border border-slate-200/80 rounded-3xl bg-white overflow-hidden flex flex-col justify-between">
                <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-lg font-extrabold text-slate-900 leading-snug">
                      {commission.nom}
                    </CardTitle>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      commission.statut === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {commission.statut === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <CardDescription className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                    {commission.description}
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
                  {commission.objectifs && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                        Objectifs Associatifs
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-4 font-medium">
                        {commission.objectifs}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
