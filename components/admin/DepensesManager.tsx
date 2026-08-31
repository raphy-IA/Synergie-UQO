'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Plus, FileText, CheckCircle2, Clock, User, Calendar, ArrowLeft, Upload, ExternalLink } from 'lucide-react';
import { getExpenseClaims, submitExpenseClaim, markExpenseAsPaid } from '@/app/actions/finances';
import { createClient } from '@/lib/supabase/client';

export default function DepensesManager() {
  const supabase = createClient();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');

  // Form State
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [montant, setMontant] = useState('');
  const [categorie, setCategorie] = useState('fournitures');
  const [justificatifFile, setJustificatifFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    const data = await getExpenseClaims();
    setExpenses(data);
    setLoading(false);
  };

  const handleOpenForm = () => {
    setTitre('');
    setDescription('');
    setMontant('');
    setCategorie('fournitures');
    setJustificatifFile(null);
    setViewMode('form');
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const valMontant = parseFloat(montant);
    if (!titre || !valMontant || valMontant <= 0) {
      alert("Veuillez renseigner un titre et un montant valide.");
      return;
    }

    setUploading(true);
    let urlJustificatif = '';

    // Upload receipt file if present
    if (justificatifFile) {
      const fileName = `factures/${Date.now()}_${justificatifFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(fileName, justificatifFile);

      if (!error && data) {
        const { data: pubUrl } = supabase.storage.from('documents').getPublicUrl(fileName);
        urlJustificatif = pubUrl.publicUrl;
      }
    }

    const res = await submitExpenseClaim({
      titre,
      description,
      montant: valMontant,
      categorie,
      justificatif_url: urlJustificatif || undefined,
    });

    setUploading(false);

    if (res.success) {
      alert("Demande de dépense soumise avec succès au circuit de validation !");
      setViewMode('list');
      fetchExpenses();
    } else {
      alert(res.error || "Erreur lors de la soumission de la dépense.");
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (confirm("Confirmer le virement / remboursement de cette dépense ?")) {
      const res = await markExpenseAsPaid(id);
      if (res.success) {
        fetchExpenses();
      } else {
        alert("Erreur lors de la mise à jour.");
      }
    }
  };

  const getStatutBadge = (st: string) => {
    switch (st) {
      case 'paye':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold';
      case 'approuve':
        return 'bg-blue-100 text-blue-900 border border-blue-200 font-extrabold';
      case 'en_attente_n1':
        return 'bg-amber-100 text-amber-900 border border-amber-200 font-bold';
      case 'en_attente_n2':
        return 'bg-purple-100 text-purple-900 border border-purple-200 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 font-bold';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {viewMode === 'list' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-blue-950">Gestion des Dépenses & Remboursements</h1>
              <p className="text-sm text-slate-500">Soumettez et suivez les demandes de prise en charge et factures de l&apos;association.</p>
            </div>
            <Button
              onClick={handleOpenForm}
              className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold px-5 h-11 rounded-xl shadow-md transition-all shrink-0 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Soumettre une dépense
            </Button>
          </div>

          <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" /> Registre des Dépenses ({expenses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <p className="text-center py-12 text-slate-400 text-sm">Chargement des dépenses...</p>
              ) : expenses.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs italic space-y-2">
                  <DollarSign className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700">Aucune demande de dépense enregistrée.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/70">
                      <TableRow>
                        <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider py-4 pl-6">Libellé / Catégorie</TableHead>
                        <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Demandeur</TableHead>
                        <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Montant</TableHead>
                        <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Justificatif</TableHead>
                        <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Statut</TableHead>
                        <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider text-right pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {expenses.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="pl-6 py-4">
                            <div className="space-y-1">
                              <span className="font-extrabold text-slate-900 text-sm block">{item.titre}</span>
                              {item.description && <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>}
                              <span className="text-[10px] text-blue-900 font-bold bg-blue-50 px-2 py-0.5 rounded-full inline-block uppercase">
                                {item.categorie}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-800">
                            {item.profiles ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-bold">
                                <User className="w-3.5 h-3.5 text-blue-900" />
                                {item.profiles.prenom} {item.profiles.nom}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Membre</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-black text-slate-900">
                            {item.montant.toFixed(2)} $ CAD
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.justificatif_url ? (
                              <a href={item.justificatif_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-900 font-bold hover:underline">
                                <FileText className="w-3.5 h-3.5" /> Voir facture <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">Aucun</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full ${getStatutBadge(item.statut)}`}>
                              {item.statut.replace('_', ' ')}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {item.statut === 'approuve' && (
                              <Button
                                size="sm"
                                onClick={() => handleMarkPaid(item.id)}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl h-8 px-3"
                              >
                                Marquer payé
                              </Button>
                            )}
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
      )}

      {/* FORMULAIRE DE SOUMISSION */}
      {viewMode === 'form' && (
        <Card className="max-w-2xl mx-auto border border-slate-200/80 shadow-xl rounded-3xl bg-white overflow-hidden">
          <div className="h-1.5 bg-emerald-600" />
          <form onSubmit={handleSaveExpense}>
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-6 bg-slate-50/50">
              <div>
                <CardTitle className="text-xl font-extrabold text-slate-900">Soumettre une note de frais / dépense</CardTitle>
                <p className="text-xs text-slate-500">Fournissez les justificatifs pour le remboursement budgétaire.</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setViewMode('list')}
                className="gap-2 font-bold text-slate-600 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" /> Retour à la liste
              </Button>
            </CardHeader>
            <CardContent className="p-8 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="titre" className="font-bold text-xs uppercase tracking-wider text-slate-700">Intitulé de la dépense *</Label>
                <Input
                  id="titre"
                  required
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex: Achat de fournitures pour l'AG annuelle"
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="montant" className="font-bold text-xs uppercase tracking-wider text-slate-700">Montant ($ CAD) *</Label>
                  <Input
                    id="montant"
                    type="number"
                    step="0.01"
                    required
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                    placeholder="150.00"
                    className="h-11 rounded-xl border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="categorie" className="font-bold text-xs uppercase tracking-wider text-slate-700">Catégorie *</Label>
                  <select
                    id="categorie"
                    value={categorie}
                    onChange={(e) => setCategorie(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="fournitures">Fournitures & Matériel</option>
                    <option value="evenement">Événement & Restauration</option>
                    <option value="deplacement">Transport & Déplacement</option>
                    <option value="communication">Impression & Publicité</option>
                    <option value="autre">Autre dépense</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="font-bold text-xs uppercase tracking-wider text-slate-700">Description & Motif</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Détails complémentaires sur le contexte de la dépense..."
                  className="rounded-xl text-xs border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="justificatif" className="font-bold text-xs uppercase tracking-wider text-slate-700">Justificatif / Reçu (PDF ou Image)</Label>
                <Input
                  id="justificatif"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setJustificatifFile(e.target.files?.[0] || null)}
                  className="h-11 rounded-xl border-slate-200 text-xs pt-2"
                />
              </div>
            </CardContent>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setViewMode('list')} className="font-bold rounded-xl">
                Annuler
              </Button>
              <Button type="submit" disabled={uploading} className="bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl px-6 h-11">
                {uploading ? 'Envoi en cours...' : 'Soumettre pour validation'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
