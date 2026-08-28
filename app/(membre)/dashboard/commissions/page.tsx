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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-8 h-8 text-slate-800" />
          Mes Commissions
        </h1>
        <p className="text-slate-600 mt-2">
          Consultez les commissions auxquelles vous participez.
        </p>
      </div>

      {!hasCommissions ? (
        <Card className="bg-slate-50 border-dashed border-slate-300 shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <Info className="w-10 h-10 mb-4 text-slate-400" />
            <p className="text-lg font-medium text-slate-700">Vous ne participez à aucune commission pour le moment.</p>
            <p className="text-sm mt-2">Lorsque vous serez ajouté à une commission par l'administration, elle apparaîtra ici.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userCommissions.map((uc: any) => {
            const commission = uc.commissions;
            if (!commission) return null;
            return (
              <Card key={commission.id} className="shadow-sm border-slate-200">
                <CardHeader className="pb-3 border-b bg-slate-50/50">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-lg font-semibold text-slate-800 line-clamp-2">
                      {commission.nom}
                    </CardTitle>
                    <Badge variant="outline" className={commission.statut === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600'}>
                      {commission.statut === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-3 mt-2">
                    {commission.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Votre rôle
                    </span>
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-medium">
                      {uc.role_commission || 'Membre'}
                    </Badge>
                  </div>
                  {commission.objectifs && (
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Objectifs
                      </span>
                      <p className="text-sm text-slate-600 line-clamp-3">
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
