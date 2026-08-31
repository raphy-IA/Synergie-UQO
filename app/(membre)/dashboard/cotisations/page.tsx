import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, CheckCircle2, Calendar, CreditCard, ShieldCheck } from 'lucide-react';
import RecuDownloadButton from '@/components/shared/RecuDownloadButton';
import SolidarityFundRequestModal from '@/components/shared/SolidarityFundRequestModal';

export const dynamic = 'force-dynamic';

export default async function CotisationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('statut_adhesion, date_adhesion, created_at')
    .eq('id', user!.id)
    .single();

  const { data: paiements, error } = await supabase
    .from('paiements')
    .select('id, created_at, montant, devise, statut, type_paiement, recu_url')
    .eq('profile_id', user!.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching payments:', error);
  }

  const totalPaye = paiements?.filter(p => p.statut === 'paid').reduce((acc, curr) => acc + Number(curr.montant), 0) || 0;
  const dernierPaiement = paiements?.[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950">Cotisations & Reçus</h1>
          <p className="text-sm text-slate-500">Consultez l&apos;état de votre adhésion et l&apos;historique complet de vos règlements.</p>
        </div>
        <SolidarityFundRequestModal />
      </div>

      {/* Cartes de synthèse */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-gradient-to-br from-blue-900 to-blue-950 text-white p-6 relative overflow-hidden">
          <div className="absolute right-3 top-3 opacity-10">
            <ShieldCheck className="w-24 h-24" />
          </div>
          <div className="space-y-2 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Statut Membre</span>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-extrabold capitalize">
                {profile?.statut_adhesion === 'approuve' ? 'Membre Approuvé' : profile?.statut_adhesion || 'En attente'}
              </h2>
            </div>
            <p className="text-xs text-blue-200 pt-1">
              Adhérent depuis le {new Date(profile?.created_at || Date.now()).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long' })}
            </p>
          </div>
        </Card>

        <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Total Cotisé</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900">{totalPaye.toFixed(2)} CAD</h2>
            <p className="text-xs text-slate-400 font-medium">Cotisations cumulées au sein de Synergie UQO</p>
          </div>
        </Card>

        <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Dernier Règlement</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-slate-900">
              {dernierPaiement ? new Date(dernierPaiement.created_at).toLocaleDateString('fr-CA', { dateStyle: 'medium' }) : 'Aucun'}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {dernierPaiement ? `${Number(dernierPaiement.montant).toFixed(2)} ${dernierPaiement.devise}` : 'Pas encore de cotisation'}
            </p>
          </div>
        </Card>
      </div>

      {/* Tableau des cotisations */}
      <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-base">Historique des transactions</h3>
          <span className="text-xs font-bold bg-blue-100 text-blue-900 px-3 py-1 rounded-full">
            {paiements?.length || 0} transaction(s)
          </span>
        </div>
        <CardContent className="p-0">
          {!paiements || paiements.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs italic">
              Aucun paiement de cotisation enregistré sur votre compte.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider py-4 pl-6">Libellé</TableHead>
                  <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Date</TableHead>
                  <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Statut</TableHead>
                  <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider text-right">Montant</TableHead>
                  <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider text-right pr-6">Attestation / Reçu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {paiements.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-extrabold text-slate-900 text-sm pl-6 py-4">
                      {p.type_paiement === 'cotisation_annuelle' ? 'Cotisation Annuelle Régulière' : p.type_paiement}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 font-medium">
                      {new Date(p.created_at).toLocaleDateString('fr-CA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {p.statut === 'paid' ? 'Réglé' : p.statut}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-black text-slate-950 text-base">
                      {Number(p.montant).toFixed(2)} <span className="text-xs font-bold text-slate-500">{p.devise}</span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <RecuDownloadButton transactionId={p.id} montant={p.montant} dateStr={p.created_at} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

