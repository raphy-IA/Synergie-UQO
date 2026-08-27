import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, FileClock, DollarSign } from 'lucide-react';

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Vue d'ensemble</h1>
        <p className="text-slate-600">Tableau de bord des statistiques de Synergie UQO.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase">Membres Actifs</CardTitle>
            <Users className="w-5 h-5 text-blue-900" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-950">{totalMembers || 0}</div>
            <p className="text-xs text-slate-600 mt-1">Membres en règle approuvés</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase">Adhésions en Attente</CardTitle>
            <FileClock className="w-5 h-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-amber-600">{pendingMembers || 0}</div>
            <p className="text-xs text-slate-600 mt-1">Candidatures à réviser</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase">Fonds Collectés</CardTitle>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-700">
              {totalRevenue.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
            </div>
            <p className="text-xs text-slate-600 mt-1">Total des cotisations en CAD</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
