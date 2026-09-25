'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Plus, FileText, CheckCircle2, Clock, User, Calendar, ArrowLeft, Upload, ExternalLink, Landmark, Building2, X, Vault, ChevronLeft, ChevronRight } from 'lucide-react';
import { getExpenseClaims, submitExpenseClaim, markExpenseAsPaid, getTreasuryAccounts, getPaymentCategories, getFinancialSummary, generateTransactionReference } from '@/app/actions/finances';
import { getWorkflowSettings, WorkflowSettings } from '@/app/actions/validation';
import { createClient } from '@/lib/supabase/client';

export default function DepensesManager() {
  const supabase = createClient();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');

  // Authorization state for payment action
  const [userRoles, setUserRoles] = useState<Set<string>>(new Set());
  const [workflowSettings, setWorkflowSettings] = useState<WorkflowSettings | null>(null);

  // Pagination State (10 items par page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form State
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [montant, setMontant] = useState('');
  const [categorie, setCategorie] = useState('fournitures');
  const [justificatifFile, setJustificatifFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchExpenses();
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const rolesSet = new Set<string>();
      const { data: userProf } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (userProf?.role) rolesSet.add(userProf.role);

      const { data: userBur } = await supabase.from('bureau_gouvernance').select('role_bureau').eq('profile_id', user.id);
      (userBur || []).forEach(b => rolesSet.add(b.role_bureau));

      setUserRoles(rolesSet);
    }
    const wf = await getWorkflowSettings();
    setWorkflowSettings(wf);
  };

  const canUserPay = (depense: any): boolean => {
    if (!workflowSettings) return true;
    const isSuperadmin = userRoles.has('superadmin');
    if (isSuperadmin) return true;

    const rolesN1Paiement = workflowSettings.roles_n1_paiement || ['tresorier'];
    const rolesN2Paiement = workflowSettings.roles_n2_paiement || ['president', 'vice_president'];
    
    const montantVal = Number(depense.montant || 0);
    const modePaiement = workflowSettings.validation_paiement_mode || 'simple';
    const seuilN2 = workflowSettings.validation_paiement_seuil_n2 ?? 500;
    const requiresN2Paiement = modePaiement !== 'simple' && montantVal >= seuilN2;

    const allowedRoles = rolesN1Paiement;
    return allowedRoles.some(r => userRoles.has(r));
  };

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

  // State pour le modal de paiement trésorerie
  const [treasuryAccounts, setTreasuryAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [methodePaiement, setMethodePaiement] = useState('virement_bancaire');
  const [refTransaction, setRefTransaction] = useState('');
  const [notesPaiement, setNotesPaiement] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const accs = await getTreasuryAccounts();
    setTreasuryAccounts(accs);
    if (accs.length > 0) setSelectedAccount(accs[0].id);

    const cats = await getPaymentCategories();
    setCategories(cats);

    const summary = await getFinancialSummary();
    setFinancialSummary(summary);
  };

  const handleMethodeChange = async (newMeth: string) => {
    setMethodePaiement(newMeth);
    const autoRef = await generateTransactionReference('decaissement', newMeth);
    setRefTransaction(autoRef);
  };

  const handleOpenPayModal = async (item: any) => {
    setSelectedExpense(item);
    setNotesPaiement('');
    const autoRef = await generateTransactionReference('decaissement', methodePaiement);
    setRefTransaction(autoRef);
  };

  const handleConfirmPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    setSubmittingPay(true);

    const res = await markExpenseAsPaid({
      depenseId: selectedExpense.id,
      compte_id: selectedAccount,
      methode_paiement: methodePaiement,
      reference_transaction: refTransaction || undefined,
      notes: notesPaiement || undefined,
    });

    setSubmittingPay(false);
    if (res.success) {
      alert("Note de frais marquée comme payée et débitée du compte de trésorerie sélectionné !");
      setSelectedExpense(null);
      fetchExpenses();
    } else {
      alert(res.error || "Erreur lors du règlement.");
    }
  };

  const getStatutBadge = (st: string) => {
    switch (st) {
      case 'paye':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold';
      case 'approuve':
        return 'bg-blue-100 text-blue-900 border border-blue-200 font-extrabold';
      case 'en_attente_n1':
      case 'en_attente_n1_2e_signature':
        return 'bg-amber-100 text-amber-900 border border-amber-200 font-bold';
      case 'en_attente_n2':
      case 'en_attente_n2_2e_signature':
        return 'bg-purple-100 text-purple-900 border border-purple-200 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 font-bold';
    }
  };

  const formatStatutLabel = (st: string) => {
    switch (st) {
      case 'en_attente_n1':
        return 'Validation N1';
      case 'en_attente_n1_2e_signature':
        return 'Validation N1 (2e signature)';
      case 'en_attente_n2':
        return 'Validation N2';
      case 'en_attente_n2_2e_signature':
        return 'Validation N2 (2e signature)';
      case 'approuve':
        return 'Approuvée (À payer)';
      case 'paye':
        return 'Payée';
      default:
        return st.replace(/_/g, ' ');
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
                <div className="w-full">
                  {/* MOBILES CARD VIEW (< md) */}
                  <div className="block md:hidden divide-y divide-slate-100">
                    {expenses
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((item) => (
                      <div key={item.id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-extrabold text-slate-900 text-sm block leading-snug">{item.titre}</span>
                            {item.description && <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{item.description}</p>}
                          </div>
                          <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 font-extrabold ${getStatutBadge(item.statut)}`}>
                            {formatStatutLabel(item.statut)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-blue-900 font-bold bg-blue-50 px-2 py-0.5 rounded-full inline-block uppercase">
                            {item.categorie}
                          </span>
                          {item.commissions && item.commissions.nom && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                              <Building2 className="w-2.5 h-2.5 text-amber-600" />
                              {item.commissions.nom}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Demandeur & Montant</span>
                            <span className="font-bold text-slate-800 block">
                              {item.profiles ? `${item.profiles.prenom} ${item.profiles.nom}` : 'Membre'}
                            </span>
                            <span className="font-black text-emerald-700 text-sm block">
                              {item.montant.toFixed(2)} $ CAD
                            </span>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {item.justificatif_url && (
                              <a href={item.justificatif_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-900 font-bold hover:underline">
                                <FileText className="w-3.5 h-3.5" /> Facture <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            {item.statut === 'approuve' && canUserPay(item) && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenPayModal(item)}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl h-8 px-3 gap-1 shadow-sm"
                              >
                                <DollarSign className="w-3.5 h-3.5" /> Payer
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* DESKTOP TABLE VIEW (>= md) */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table className="w-full min-w-[700px]">
                      <TableHeader className="bg-slate-50/70">
                        <TableRow>
                          <TableHead className="w-[35%] font-extrabold text-xs text-slate-700 uppercase tracking-wider py-4 pl-6">Libellé / Catégorie</TableHead>
                          <TableHead className="w-[20%] font-extrabold text-xs text-slate-700 uppercase tracking-wider">Demandeur</TableHead>
                          <TableHead className="w-[12%] font-extrabold text-xs text-slate-700 uppercase tracking-wider">Montant</TableHead>
                          <TableHead className="w-[13%] font-extrabold text-xs text-slate-700 uppercase tracking-wider">Justificatif</TableHead>
                          <TableHead className="w-[10%] font-extrabold text-xs text-slate-700 uppercase tracking-wider">Statut</TableHead>
                          <TableHead className="w-[10%] font-extrabold text-xs text-slate-700 uppercase tracking-wider text-right pr-6">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {expenses
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((item) => (
                          <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="pl-6 py-4 whitespace-normal break-words">
                              <div className="space-y-1">
                                <span className="font-extrabold text-slate-900 text-sm block">{item.titre}</span>
                                {item.description && <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>}
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  <span className="text-[10px] text-blue-900 font-bold bg-blue-50 px-2 py-0.5 rounded-full inline-block uppercase">
                                    {item.categorie}
                                  </span>
                                  {item.commissions && item.commissions.nom && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                                      <Building2 className="w-2.5 h-2.5 text-amber-600" />
                                      Commission : {item.commissions.nom}
                                    </span>
                                  )}
                                  {item.taches && item.taches.titre && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-indigo-800 font-bold bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-full">
                                      <Landmark className="w-2.5 h-2.5 text-indigo-600" />
                                      Tâche : {item.taches.titre}
                                    </span>
                                  )}
                                </div>
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
                                {formatStatutLabel(item.statut)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right pr-6 whitespace-nowrap">
                              {item.statut === 'approuve' && canUserPay(item) && (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenPayModal(item)}
                                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl h-8 px-4 gap-1.5 shadow-sm"
                                >
                                  <DollarSign className="w-3.5 h-3.5" /> Payer
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* BARRE DE PAGINATION (10 PAR PAGE) */}
                  {Math.ceil(expenses.length / itemsPerPage) > 1 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold">
                        Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, expenses.length)} sur {expenses.length} dépenses
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
                          Page {currentPage} / {Math.ceil(expenses.length / itemsPerPage)}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= Math.ceil(expenses.length / itemsPerPage)}
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

      {/* MODAL DE SÉLECTION DU COMPTE DE TRÉSORERIE ET MODALITÉ DE RÈGLEMENT */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Vault className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base">Règlement & Décaissement Trésorerie</h3>
              </div>
              <button
                onClick={() => setSelectedExpense(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPay} className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 border rounded-2xl space-y-1">
                <span className="text-xs text-slate-500 font-bold uppercase block">Demande de Dépense :</span>
                <span className="font-extrabold text-slate-900 text-sm block">{selectedExpense.titre}</span>
                <span className="text-base font-black text-emerald-700 block">{Number(selectedExpense.montant).toFixed(2)} $ CAD</span>
                {selectedExpense.profiles && (
                  <span className="text-xs text-slate-500 block">Bénéficiaire : {selectedExpense.profiles.prenom} {selectedExpense.profiles.nom}</span>
                )}
              </div>

              {/* Sélection du Compte Débiteur */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="compteDebiteur" className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Compte Bancaire / Caisse (Sortie d'argent) *
                  </Label>
                  {selectedAccount && financialSummary?.encaisséParCompte && (
                    <span className="text-[10px] font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Solde : {Number((financialSummary.encaisséParCompte[selectedAccount] || 0) - (financialSummary.décaisseParCompte[selectedAccount] || 0)).toFixed(2)} $ CAD
                    </span>
                  )}
                </div>
                <select
                  id="compteDebiteur"
                  required
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-extrabold text-blue-950 focus:ring-2 focus:ring-blue-900 shadow-sm"
                >
                  {treasuryAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.nom}</option>
                  ))}
                </select>
              </div>

              {/* Sélection du Compte Analytique d'origine */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="compteAnalytique" className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Compte Analytique
                  </Label>
                  {selectedCategory && financialSummary?.analyseParCategorie && (
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Solde Réserve : {Number(financialSummary.analyseParCategorie.find((c: any) => c.categorie === selectedCategory)?.soldeNet || 0).toFixed(2)} $ CAD
                    </span>
                  )}
                </div>
                <select
                  id="compteAnalytique"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-extrabold text-blue-950 focus:ring-2 focus:ring-blue-900 shadow-sm"
                >
                  <option value="">Non spécifié / Trésorerie Générale</option>
                  {categories.map(cat => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Mode de virement / remboursement */}
              <div className="space-y-1.5">
                <Label htmlFor="methodePay" className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Mode de Décaissement *
                </Label>
                <select
                  id="methodePay"
                  value={methodePaiement}
                  onChange={(e) => handleMethodeChange(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-blue-900"
                >
                  <option value="virement_interac">Virement Interac</option>
                  <option value="virement_bancaire">Virement Bancaire (Direct)</option>
                  <option value="cheque">Chèque Émis</option>
                  <option value="especes">Comptant / Petite Caisse</option>
                  <option value="autre">Autre mode</option>
                </select>
              </div>

              {/* Référence transaction */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="refPay" className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Référence de Transaction (Générée automatiquement, modifiable)
                  </Label>
                  <button
                    type="button"
                    onClick={() => handleMethodeChange(methodePaiement)}
                    className="text-[10px] text-blue-900 font-extrabold hover:underline"
                  >
                    Régénérer
                  </button>
                </div>
                <Input
                  id="refPay"
                  placeholder="Ex: DEC-VIR-202609-0001"
                  value={refTransaction}
                  onChange={(e) => setRefTransaction(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 text-xs font-mono font-bold text-blue-950 bg-slate-50/50"
                />
              </div>

              {/* Notes comptables */}
              <div className="space-y-1.5">
                <Label htmlFor="notesPay" className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Notes de Décaissement (Optionnel)
                </Label>
                <Input
                  id="notesPay"
                  placeholder="Remarques pour la comptabilité..."
                  value={notesPaiement}
                  onChange={(e) => setNotesPaiement(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 text-xs"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedExpense(null)}
                  className="h-11 rounded-xl px-5 text-xs font-bold"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={submittingPay}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold h-11 rounded-xl px-6 text-xs gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submittingPay ? "Validation du décaissement..." : "Confirmer le paiement"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
