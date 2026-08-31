'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpRight, Search, FileText, User, CreditCard, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function RevenueManager() {
  const supabase = createClient();
  const [payments, setPayments] = useState<any[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('tous');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    let result = payments;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        (p.profiles && `${p.profiles.prenom} ${p.profiles.nom}`.toLowerCase().includes(q)) ||
        (p.type_paiement && p.type_paiement.toLowerCase().includes(q))
      );
    }
    if (typeFilter !== 'tous') {
      result = result.filter(p => p.type_paiement === typeFilter);
    }
    setFilteredPayments(result);
  }, [searchQuery, typeFilter, payments]);

  const fetchPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('paiements')
      .select(`
        *,
        profiles (prenom, nom, email)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setPayments(data);
      setFilteredPayments(data);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-blue-950">Registre des Revenus & Cotisations</h2>
          <p className="text-xs text-slate-500">Suivi détaillé des cotisations des membres, subventions et ventes de billets.</p>
        </div>
      </div>

      {/* Barre de recherche & Filtres */}
      <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom de membre, type de paiement..."
              className="pl-9 h-10 border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 shrink-0">Type :</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 text-xs font-bold px-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-900 w-full md:w-44"
            >
              <option value="tous">Tous les revenus</option>
              <option value="cotisation_annuelle">Cotisations Annuelles</option>
              <option value="partenariat">Partenariats</option>
              <option value="evenement">Billetterie Événement</option>
              <option value="don">Dons & Subventions</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-emerald-600" /> Flux d&apos;Entrées Financières ({filteredPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-12 text-slate-400 text-sm">Chargement du registre des revenus...</p>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs italic space-y-2">
              <CreditCard className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">Aucun versement enregistré.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/70">
                  <TableRow>
                    <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider py-4 pl-6">Membre / Émetteur</TableHead>
                    <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Nature du Revenu</TableHead>
                    <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Montant Encassé</TableHead>
                    <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Date de Transaction</TableHead>
                    <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider text-right pr-6">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {filteredPayments.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-900 text-sm block">
                            {item.profiles ? `${item.profiles.prenom} ${item.profiles.nom}` : 'Membre Inconnu'}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">{item.profiles?.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wide">
                          {item.type_paiement ? item.type_paiement.replace('_', ' ') : 'Cotisation'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-black text-emerald-700">
                        +{Number(item.montant).toFixed(2)} $ CAD
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-medium">
                        {new Date(item.created_at).toLocaleDateString('fr-CA', { dateStyle: 'medium' })}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-3 py-1 rounded-full uppercase">
                          {item.statut === 'succeeded' ? 'Reçu (Confirmé)' : item.statut}
                        </span>
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
