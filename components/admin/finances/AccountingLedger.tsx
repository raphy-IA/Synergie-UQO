'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpRight, ArrowDownRight, Search, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { getAccountingLedger } from '@/app/actions/finances';

export default function AccountingLedger() {
  const [ledger, setLedger] = useState<any[]>([]);
  const [filteredLedger, setFilteredLedger] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('tous');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLedger();
  }, []);

  useEffect(() => {
    let result = ledger;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.libelle.toLowerCase().includes(q) ||
        (l.tiers && l.tiers.toLowerCase().includes(q)) ||
        l.categorie.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'tous') {
      result = result.filter(l => l.type === typeFilter);
    }
    setFilteredLedger(result);
  }, [searchQuery, typeFilter, ledger]);

  const fetchLedger = async () => {
    setLoading(true);
    const data = await getAccountingLedger();
    setLedger(data);
    setFilteredLedger(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-blue-950">Journal Comptable & Mouvements de Trésorerie</h2>
        <p className="text-xs text-slate-500">Traçabilité chronologique complète de toutes les opérations d&apos;entrées (Crédits) et de sorties (Débits).</p>
      </div>

      {/* Barre de recherche & Filtres */}
      <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une écriture, un membre/tiers..."
              className="pl-9 h-10 border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 shrink-0">Sens du Mouvement :</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 text-xs font-bold px-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-900 w-full md:w-44"
            >
              <option value="tous">Tous les mouvements</option>
              <option value="credit">Crédits (Entrées / Revenus)</option>
              <option value="debit">Débits (Sorties / Dépenses)</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-900" /> Grand Livre des Écritures ({filteredLedger.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-12 text-slate-400 text-sm">Chargement du journal comptable...</p>
          ) : filteredLedger.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs italic space-y-2">
              <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">Aucune écriture comptable enregistrée.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/70">
                  <TableRow>
                    <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider py-4 pl-6">Date</TableHead>
                    <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Libellé de l&apos;Opération</TableHead>
                    <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Tiers / Intervenant</TableHead>
                    <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider text-right">Crédit (Entrée)</TableHead>
                    <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider text-right pr-6">Débit (Sortie)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {filteredLedger.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors text-xs">
                      <TableCell className="pl-6 py-4 font-semibold text-slate-600">
                        {new Date(item.date).toLocaleDateString('fr-CA', { dateStyle: 'short' })}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-900 block">{item.libelle}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                            Catégorie : {item.categorie}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-slate-800">
                        {item.tiers}
                      </TableCell>
                      <TableCell className="text-right font-black text-emerald-700 text-sm">
                        {item.type === 'credit' ? `+${item.montant.toFixed(2)} $` : '-'}
                      </TableCell>
                      <TableCell className="text-right pr-6 font-black text-red-700 text-sm">
                        {item.type === 'debit' ? `-${item.montant.toFixed(2)} $` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
