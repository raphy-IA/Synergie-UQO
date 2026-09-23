'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpRight, ArrowDownRight, Search, FileSpreadsheet, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAccountingLedger } from '@/app/actions/finances';

export default function AccountingLedger() {
  const [ledger, setLedger] = useState<any[]>([]);
  const [filteredLedger, setFilteredLedger] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('tous');
  const [loading, setLoading] = useState(true);

  // Pagination State (Minimum 25 items par page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

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
    setCurrentPage(1);
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
            <div className="w-full">
              <Table className="w-full table-fixed">
                <TableHeader className="bg-slate-50/70">
                  <TableRow>
                    <TableHead className="w-[105px] font-extrabold text-xs text-slate-700 uppercase tracking-wider py-4 pl-6">Date</TableHead>
                    <TableHead className="w-[35%] font-extrabold text-xs text-slate-700 uppercase tracking-wider">Libellé & Catégorie</TableHead>
                    <TableHead className="w-[20%] font-extrabold text-xs text-slate-700 uppercase tracking-wider">Tiers / Intervenant</TableHead>
                    <TableHead className="w-[18%] font-extrabold text-xs text-slate-700 uppercase tracking-wider">Mode & Réf.</TableHead>
                    <TableHead className="w-[13.5%] font-extrabold text-xs text-slate-700 uppercase tracking-wider text-right">Crédit</TableHead>
                    <TableHead className="w-[13.5%] font-extrabold text-xs text-slate-700 uppercase tracking-wider text-right pr-6">Débit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {filteredLedger
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors text-xs">
                      <TableCell className="pl-6 py-4 font-semibold text-slate-600 whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString('fr-CA', { dateStyle: 'short' })}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-900 block">{item.libelle}</span>
                          <span className="text-[10px] text-blue-900 font-bold bg-blue-50 px-2 py-0.5 rounded-full inline-block uppercase tracking-wider">
                            {item.categorie.replace('_', ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-slate-800 whitespace-normal break-words">
                        {item.tiers}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 whitespace-normal break-words">
                        <div className="space-y-0.5">
                          <span className="font-bold block capitalize text-slate-700">{item.methode ? item.methode.replace('_', ' ') : 'Virement'}</span>
                          {item.reference && item.reference !== '-' && (
                            <span className="text-[10px] text-slate-400 font-mono">Ref: {item.reference}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-emerald-700 text-sm whitespace-nowrap">
                        {item.type === 'credit' ? `+${item.montant.toFixed(2)} $` : '-'}
                      </TableCell>
                      <TableCell className="text-right pr-6 font-black text-red-700 text-sm whitespace-nowrap">
                        {item.type === 'debit' ? `-${item.montant.toFixed(2)} $` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* BARRE DE PAGINATION COMPTABLE (MINIMUM 25 LIGNES PAR PAGE) */}
              {Math.ceil(filteredLedger.length / itemsPerPage) > 1 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold">
                    Affichage des écritures {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, filteredLedger.length)} sur {filteredLedger.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                      className="h-8 rounded-xl font-bold gap-1 text-slate-700"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Précédent
                    </Button>
                    <span className="font-extrabold px-2 text-blue-950">
                      Page {currentPage} / {Math.ceil(filteredLedger.length / itemsPerPage)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= Math.ceil(filteredLedger.length / itemsPerPage)}
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="h-8 rounded-xl font-bold gap-1 text-slate-700"
                    >
                      Suivant <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
