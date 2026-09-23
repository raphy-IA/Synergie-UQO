'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpRight, Search, CreditCard, Plus, X, UserCheck, DollarSign, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getPaymentCategories, createManualPayment } from '@/app/actions/finances';

export default function RevenueManager() {
  const supabase = createClient();
  const [payments, setPayments] = useState<any[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('tous');
  const [loading, setLoading] = useState(true);

  // Dynamic Payment Categories
  const [categories, setCategories] = useState<{ key: string; label: string }[]>([]);

  // Profiles list for manual selection
  const [profiles, setProfiles] = useState<{ id: string; prenom: string; nom: string; email: string }[]>([]);

  // Modal State for Manual Entry
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [montant, setMontant] = useState('50');
  const [selectedCategory, setSelectedCategory] = useState('cotisation_annuelle');
  const [methodePaiement, setMethodePaiement] = useState('interac');
  const [refTransaction, setRefTransaction] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchPayments();
    loadCategories();
    fetchProfiles();
  }, []);

  const loadCategories = async () => {
    const cats = await getPaymentCategories();
    setCategories(cats);
    if (cats.length > 0 && !selectedCategory) {
      setSelectedCategory(cats[0].key);
    }
  };

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, prenom, nom, email')
      .order('nom', { ascending: true });
    if (data) setProfiles(data);
  };

  useEffect(() => {
    let result = payments;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        (p.profiles && `${p.profiles.prenom} ${p.profiles.nom}`.toLowerCase().includes(q)) ||
        (p.type_paiement && p.type_paiement.toLowerCase().includes(q)) ||
        (p.methode_paiement && p.methode_paiement.toLowerCase().includes(q))
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

  const handleCreateManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const valMontant = parseFloat(montant);
    if (isNaN(valMontant) || valMontant <= 0) {
      alert("Veuillez saisir un montant valide.");
      setSubmitting(false);
      return;
    }

    const res = await createManualPayment({
      profile_id: selectedProfileId || undefined,
      montant: valMontant,
      type_paiement: selectedCategory,
      methode_paiement: methodePaiement,
      reference_transaction: refTransaction || undefined,
      notes: notes || undefined,
    });

    if (res.success) {
      alert("Paiement manuel enregistré avec succès !");
      setShowModal(false);
      // Reset form
      setSelectedProfileId('');
      setMontant('50');
      setRefTransaction('');
      setNotes('');
      fetchPayments();
    } else {
      alert(res.error || "Erreur lors de l'enregistrement du paiement.");
    }
    setSubmitting(false);
  };

  const getCategoryLabel = (catKey: string) => {
    const found = categories.find(c => c.key === catKey);
    if (found) return found.label;
    return catKey.replace('_', ' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-blue-950">Registre des Revenus & Cotisations</h2>
          <p className="text-xs text-slate-500">Suivi détaillé des cotisations des membres, subventions et recettes encaissées.</p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-11 rounded-2xl px-5 gap-2 shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" /> Enregistrer un paiement manuel
        </Button>
      </div>

      {/* Barre de recherche & Filtres */}
      <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom de membre, mode de paiement..."
              className="pl-9 h-10 border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 shrink-0">Catégorie :</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 text-xs font-bold px-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-900 w-full md:w-48"
            >
              <option value="tous">Toutes les catégories</option>
              {categories.map(cat => (
                <option key={cat.key} value={cat.key}>{cat.label}</option>
              ))}
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
            <div className="w-full">
              <Table className="w-full table-fixed">
                <TableHeader className="bg-slate-50/70">
                  <TableRow>
                    <TableHead className="w-[28%] font-extrabold text-xs text-slate-700 uppercase tracking-wider py-4 pl-6">Membre / Émetteur</TableHead>
                    <TableHead className="w-[18%] font-extrabold text-xs text-slate-700 uppercase tracking-wider">Nature du Revenu</TableHead>
                    <TableHead className="w-[18%] font-extrabold text-xs text-slate-700 uppercase tracking-wider">Mode & Réf.</TableHead>
                    <TableHead className="w-[14%] font-extrabold text-xs text-slate-700 uppercase tracking-wider">Montant</TableHead>
                    <TableHead className="w-[12%] font-extrabold text-xs text-slate-700 uppercase tracking-wider">Date</TableHead>
                    <TableHead className="w-[10%] font-extrabold text-xs text-slate-700 uppercase tracking-wider text-right pr-6">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {filteredPayments.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors text-xs">
                      <TableCell className="pl-6 py-4 whitespace-normal break-words">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-900 text-xs block">
                            {item.profiles ? `${item.profiles.prenom} ${item.profiles.nom}` : 'Organisme / Externe'}
                          </span>
                          {item.profiles?.email && (
                            <span className="text-[11px] text-slate-400 font-medium block truncate">{item.profiles.email}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal break-words">
                        <span className="text-[10px] font-bold text-blue-900 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full uppercase tracking-wide inline-block">
                          {getCategoryLabel(item.type_paiement)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 font-medium whitespace-normal break-words">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 block capitalize">{item.methode_paiement || 'En ligne (Stripe)'}</span>
                          {item.reference_transaction && (
                            <span className="text-[10px] text-slate-400 font-mono block truncate">Ref: {item.reference_transaction}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-black text-emerald-700 whitespace-nowrap">
                        +{Number(item.montant).toFixed(2)} $
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-medium whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString('fr-CA', { dateStyle: 'short' })}
                      </TableCell>
                      <TableCell className="text-right pr-6 whitespace-nowrap">
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-1 rounded-full uppercase">
                          {item.statut === 'succeeded' ? 'Reçu' : item.statut}
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

      {/* MODAL ENREGISTRER UN PAIEMENT MANUEL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base">Enregistrer une Entrée d&apos;Argent</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualPayment} className="p-6 space-y-4">
              {/* Membre émetteur (Optionnel) */}
              <div className="space-y-1.5">
                <Label htmlFor="membre" className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Membre concerné (Optionnel)
                </Label>
                <select
                  id="membre"
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-blue-900"
                >
                  <option value="">-- Versé par un tiers / non rattaché à un membre --</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.prenom} {p.nom} ({p.email})</option>
                  ))}
                </select>
              </div>

              {/* Catégorie du versement */}
              <div className="space-y-1.5">
                <Label htmlFor="cat" className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Catégorie de Recette *
                </Label>
                <select
                  id="cat"
                  required
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-extrabold text-blue-950 focus:ring-2 focus:ring-blue-900"
                >
                  {categories.map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Montant & Mode de paiement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="montant" className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Montant ($ CAD) *
                  </Label>
                  <Input
                    id="montant"
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                    className="h-11 rounded-xl border-slate-200 font-extrabold text-emerald-700 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="methode" className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Mode de Règlement *
                  </Label>
                  <select
                    id="methode"
                    value={methodePaiement}
                    onChange={(e) => setMethodePaiement(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="interac">Virement Interac</option>
                    <option value="especes">Comptant / Espèces</option>
                    <option value="cheque">Chèque</option>
                    <option value="virement_bancaire">Virement Bancaire</option>
                    <option value="autre">Autre mode</option>
                  </select>
                </div>
              </div>

              {/* Numéro de référence / transaction */}
              <div className="space-y-1.5">
                <Label htmlFor="ref" className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Référence Transaction / N° Chèque (Optionnel)
                </Label>
                <Input
                  id="ref"
                  placeholder="Ex: INT-9823412 ou CHQ-0012"
                  value={refTransaction}
                  onChange={(e) => setRefTransaction(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 text-xs"
                />
              </div>

              {/* Notes complémentaires */}
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Notes / Commentaire (Optionnel)
                </Label>
                <Input
                  id="notes"
                  placeholder="Remarques pour la comptabilité..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 text-xs"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="h-11 rounded-xl px-5 text-xs font-bold"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold h-11 rounded-xl px-6 text-xs gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? "Enregistrement..." : "Confirmer le paiement"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
