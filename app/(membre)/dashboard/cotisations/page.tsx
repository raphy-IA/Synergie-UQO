import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function CotisationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: paiements, error } = await supabase
    .from('paiements')
    .select('id, created_at, montant, devise, statut, type_paiement, recu_url')
    .eq('profile_id', user!.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching payments:', error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Cotisations & Factures</h1>
        <p className="text-slate-600">Historique complet de vos règlements de cotisation de membre.</p>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        {!paiements || paiements.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Aucun paiement de cotisation enregistré.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Détails du paiement</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Justificatif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paiements.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold text-slate-900">
                    {p.type_paiement === 'cotisation_annuelle' ? 'Cotisation Annuelle' : p.type_paiement}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {new Date(p.created_at).toLocaleDateString('fr-CA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      {p.statut === 'paid' ? 'Payé' : p.statut}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-950">
                    {Number(p.montant).toFixed(2)} {p.devise}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-blue-900" onClick={() => window.print()}>
                      <FileText className="w-4 h-4" /> Reçu PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
