'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Shield, CheckCircle2, XCircle, AlertCircle, Clock, Calendar, User, DollarSign, FileText, Vote, Building2, Check, ArrowRight, Eye, ExternalLink, MapPin, Users } from 'lucide-react';
import { getPendingValidations, processValidationDecision, getEntityDetails, getWorkflowSettings, WorkflowSettings } from '@/app/actions/validation';
import { getTreasuryAccounts, getPaymentCategories, markExpenseAsPaid, getFinancialSummary, generateTransactionReference } from '@/app/actions/finances';
import { createClient } from '@/lib/supabase/client';

export default function ValidationCenter() {
  const supabase = createClient();
  const [validations, setValidations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('tous');

  // User & Workflow Authorization State
  const [userId, setUserId] = useState<string>('');
  const [userRoles, setUserRoles] = useState<Set<string>>(new Set());
  const [workflowSettings, setWorkflowSettings] = useState<WorkflowSettings | null>(null);

  // Decision Modal State
  const [selectedValidation, setSelectedValidation] = useState<any | null>(null);
  const [decision, setDecision] = useState<'approuve' | 'rejete' | 'modifications_demandees'>('approuve');
  const [commentaire, setCommentaire] = useState('');
  const [dateEffet, setDateEffet] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment Modal State (For Treasury Decaissement)
  const [treasuryAccounts, setTreasuryAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any | null>(null);
  const [payModalItem, setPayModalItem] = useState<any | null>(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [methodePaiement, setMethodePaiement] = useState('virement_bancaire');
  const [refTransaction, setRefTransaction] = useState('');
  const [notesPaiement, setNotesPaiement] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  // Preview Modal State
  const [previewItem, setPreviewItem] = useState<{ val: any; details: any } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchValidations();
    loadTreasuryAccounts();
    loadUserAndWorkflowPermissions();
  }, []);

  const loadUserAndWorkflowPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
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

  // Helper pour vérifier si l'utilisateur connecté a le droit d'agir sur un élément
  const canUserActOnItem = (val: any): boolean => {
    if (!workflowSettings) return true;

    const isSuperadmin = userRoles.has('superadmin');

    const isPendingPayment = val.statut_validation === 'approuve';

    if (isPendingPayment) {
      // Étape de Paiement / Décaissement
      const rolesN1Paiement = workflowSettings.roles_n1_paiement || ['tresorier'];
      const rolesN2Paiement = workflowSettings.roles_n2_paiement || ['president', 'vice_president'];
      
      const isN1PaiementStage = val.statut_validation === 'approuve' || val.statut_validation === 'en_attente_n1' || val.statut_validation === 'en_attente_n1_2e_signature';

      const allowedPaiementRoles = isN1PaiementStage ? rolesN1Paiement : rolesN2Paiement;
      return isSuperadmin || allowedPaiementRoles.some(r => userRoles.has(r));
    } else {
      // Étape d'Examen (Signatures N1 / N2)
      const isN1Stage = val.statut_validation === 'en_attente_n1' || val.statut_validation === 'en_attente_n1_2e_signature';
      let allowedRoles: string[] = [];

      if (val.type_entite === 'depense') {
        allowedRoles = isN1Stage ? (workflowSettings.roles_n1_depenses || ['tresorier', 'vice_president']) : (workflowSettings.roles_n2_depenses || ['president', 'vice_president']);
      } else if (val.type_entite === 'evenement') {
        allowedRoles = isN1Stage ? (workflowSettings.roles_n1_evenements || ['secretaire', 'vice_president', 'responsable_commission']) : (workflowSettings.roles_n2_evenements || ['president', 'vice_president']);
      } else if (val.type_entite === 'article') {
        allowedRoles = isN1Stage ? (workflowSettings.roles_n1_articles || ['responsable_com', 'vice_president']) : (workflowSettings.roles_n2_articles || ['president', 'vice_president']);
      } else if (val.type_entite === 'vote') {
        allowedRoles = isN1Stage ? (workflowSettings.roles_n1_votes || ['secretaire', 'vice_president']) : (workflowSettings.roles_n2_votes || ['president', 'vice_president']);
      } else if (val.type_entite === 'partenaire') {
        allowedRoles = isN1Stage ? (workflowSettings.roles_n1_partenaires || ['responsable_partenariats', 'vice_president']) : (workflowSettings.roles_n2_partenaires || ['president', 'vice_president']);
      }

      return isSuperadmin || userRoles.has('president') || userRoles.has('vice_president') || allowedRoles.some(r => userRoles.has(r));
    }
  };

  const loadTreasuryAccounts = async () => {
    const accs = await getTreasuryAccounts();
    setTreasuryAccounts(accs);
    if (accs.length > 0) setSelectedAccount(accs[0].id);

    const cats = await getPaymentCategories();
    setCategories(cats);

    const summary = await getFinancialSummary();
    setFinancialSummary(summary);
  };

  const fetchValidations = async () => {
    setLoading(true);
    const data = await getPendingValidations();
    setValidations(data);
    setLoading(false);
  };

  const handleOpenDecisionModal = (val: any) => {
    setSelectedValidation(val);
    setDecision('approuve');
    setCommentaire('');
    setDateEffet(val.date_effet_programmee ? new Date(val.date_effet_programmee).toISOString().slice(0, 16) : '');
  };

  const handleMethodeChange = async (newMeth: string) => {
    setMethodePaiement(newMeth);
    const autoRef = await generateTransactionReference('decaissement', newMeth);
    setRefTransaction(autoRef);
  };

  const handleOpenPayModal = async (val: any) => {
    setPayModalItem(val);
    setNotesPaiement('');
    const autoRef = await generateTransactionReference('decaissement', methodePaiement);
    setRefTransaction(autoRef);
  };

  const handleConfirmPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalItem) return;
    setSubmittingPay(true);

    const res = await markExpenseAsPaid({
      depenseId: payModalItem.entite_id,
      compte_id: selectedAccount,
      methode_paiement: methodePaiement,
      reference_transaction: refTransaction || undefined,
      notes: notesPaiement || undefined,
    });

    setSubmittingPay(false);
    if (res.success) {
      alert("Paiement effectué ! La dépense a été imputée au compte de trésorerie sélectionné.");
      setPayModalItem(null);
      fetchValidations();
    } else {
      alert(res.error || "Erreur lors du paiement.");
    }
  };

  const handleOpenPreview = async (val: any) => {
    setPreviewLoading(true);
    const details = await getEntityDetails(val.type_entite, val.entite_id);
    setPreviewItem({ val, details });
    setPreviewLoading(false);
  };

  const handleConfirmDecision = async () => {
    if (!selectedValidation) return;
    setIsSubmitting(true);

    const res = await processValidationDecision({
      validationId: selectedValidation.id,
      decision,
      commentaire,
      dateEffet: dateEffet || null,
    });

    setIsSubmitting(false);

    if (res.success) {
      alert("Décision de validation enregistrée avec succès !");
      setSelectedValidation(null);
      fetchValidations();
    } else {
      alert(res.error || "Erreur lors du traitement de la décision.");
    }
  };

  const [filterStatusStage, setFilterStatusStage] = useState<'tous' | 'a_signer' | 'a_payer'>('tous');

  const filtered = validations.filter(val => {
    const matchesType = filterType === 'tous' || val.type_entite === filterType;
    const isPendingPayment = val.statut_validation === 'approuve';
    const matchesStage =
      filterStatusStage === 'tous' ? true :
      filterStatusStage === 'a_payer' ? isPendingPayment :
      !isPendingPayment;

    return matchesType && matchesStage;
  });

  const countASigner = validations.filter(v => v.statut_validation !== 'approuve').length;
  const countAPayer = validations.filter(v => v.statut_validation === 'approuve').length;

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'evenement': return <Calendar className="w-5 h-5 text-amber-500" />;
      case 'article': return <FileText className="w-5 h-5 text-blue-900" />;
      case 'vote': return <Vote className="w-5 h-5 text-blue-900" />;
      case 'partenaire': return <Building2 className="w-5 h-5 text-amber-500" />;
      case 'depense': return <DollarSign className="w-5 h-5 text-emerald-600" />;
      default: return <Shield className="w-5 h-5 text-blue-900" />;
    }
  };

  const getDirectEntityUrl = (type: string, id: string) => {
    switch (type) {
      case 'evenement': return `/admin/evenements?id=${id}`;
      case 'article': return `/admin/articles?id=${id}`;
      case 'vote': return `/admin/votes?id=${id}`;
      case 'partenaire': return `/admin/partenaires?id=${id}`;
      case 'depense': return `/admin/finances?id=${id}`;
      default: return '/admin';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-blue-950">Centre de Validation & Gouvernance</h2>
          <p className="text-xs text-slate-500">Examinez et approuvez les soumissions d&apos;événements, articles, votes, partenaires et décaissez les dépenses.</p>
        </div>

        {/* Filtres d'Étapes et de Types */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {/* Filtre d'étape */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-2xl">
            <button
              onClick={() => setFilterStatusStage('tous')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatusStage === 'tous' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous ({validations.length})
            </button>
            <button
              onClick={() => setFilterStatusStage('a_signer')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatusStage === 'a_signer' ? 'bg-white text-amber-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              À Valider ({countASigner})
            </button>
            <button
              onClick={() => setFilterStatusStage('a_payer')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatusStage === 'a_payer' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              À Payer ({countAPayer})
            </button>
          </div>

          {/* Filtres par type */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl flex-wrap">
            {['tous', 'evenement', 'article', 'vote', 'partenaire', 'depense'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold capitalize transition-all ${
                  filterType === type ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type === 'tous' ? 'Toutes entités' : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-center py-12 text-xs italic">Chargement des demandes de validation...</p>
      ) : filtered.length === 0 ? (
        <Card className="border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-2 bg-white">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="font-extrabold text-slate-900 text-base">Aucune demande dans ce filtre</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">Toutes les soumissions de cette catégorie ont été traitées.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(val => {
            const isApprovedPendingPayment = val.statut_validation === 'approuve';

            return (
              <Card key={val.id} className={`border shadow-md rounded-3xl bg-white overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all ${
                isApprovedPendingPayment ? 'border-emerald-200/90 ring-1 ring-emerald-100' : 'border-slate-200/80'
              }`}>
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl shrink-0 ${isApprovedPendingPayment ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100'}`}>
                        {getEntityIcon(val.type_entite)}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block">
                          Demande #{val.type_entite}
                        </span>
                        <span className="text-xs font-bold text-blue-900 capitalize block">
                          {isApprovedPendingPayment ? 'Approuvée (En attente de paiement)' :
                           val.statut_validation === 'en_attente_n1' ? 'Validation_N1 (1re signature)' :
                           val.statut_validation === 'en_attente_n1_2e_signature' ? 'Validation_N1 (2e signature requise)' :
                           val.statut_validation === 'en_attente_n2' ? 'Validation_N2 (1re signature)' :
                           val.statut_validation === 'en_attente_n2_2e_signature' ? 'Validation_N2 (2e signature requise)' :
                           'En attente d\'examen'}
                        </span>
                      </div>
                    </div>
                    {isApprovedPendingPayment ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full font-extrabold flex items-center gap-1 shrink-0">
                        <DollarSign className="w-3 h-3 text-emerald-700" /> À Payer
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-extrabold flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" /> À Valider
                      </span>
                    )}
                  </div>

                  {val.titre_entite && (
                    <div className="pt-1">
                      <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2">
                        {val.titre_entite}
                      </h3>
                    </div>
                  )}

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Soumis par :</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {val.profiles ? `${val.profiles.prenom} ${val.profiles.nom}` : 'Membre'}
                      </span>
                    </div>
                    {val.date_effet_programmee && (
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Date d&apos;effet souhaitée :</span>
                        <span className="font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md">
                          {new Date(val.date_effet_programmee).toLocaleDateString('fr-CA', { dateStyle: 'short' })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Date de soumission :</span>
                      <span>{new Date(val.created_at).toLocaleString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Historique des Validations effectuées */}
                    {(val.date_validation_n1 || val.date_validation_n1_bis || val.date_validation_n2 || val.date_validation_n2_bis) && (
                      <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5 bg-slate-50 p-2.5 rounded-xl text-[11px]">
                        <span className="font-extrabold text-blue-950 uppercase tracking-wider block text-[10px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Historique des Signatures :
                        </span>
                        {val.date_validation_n1 && (
                          <div className="flex items-center justify-between text-slate-700">
                            <span>Signature N1 :</span>
                            <span className="font-bold text-slate-900">
                              {val.val_n1 ? `${val.val_n1.prenom} ${val.val_n1.nom}` : 'Valideur N1'} ({new Date(val.date_validation_n1).toLocaleString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })})
                            </span>
                          </div>
                        )}
                        {val.date_validation_n1_bis && (
                          <div className="flex items-center justify-between text-slate-700">
                            <span>Co-signature N1 :</span>
                            <span className="font-bold text-slate-900">
                              {val.val_n1_bis ? `${val.val_n1_bis.prenom} ${val.val_n1_bis.nom}` : 'Valideur N1 Bis'} ({new Date(val.date_validation_n1_bis).toLocaleString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })})
                            </span>
                          </div>
                        )}
                        {val.date_validation_n2 && (
                          <div className="flex items-center justify-between text-slate-700">
                            <span>Signature N2 :</span>
                            <span className="font-bold text-slate-900">
                              {val.val_n2 ? `${val.val_n2.prenom} ${val.val_n2.nom}` : 'Valideur N2'} ({new Date(val.date_validation_n2).toLocaleString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })})
                            </span>
                          </div>
                        )}
                        {val.date_validation_n2_bis && (
                          <div className="flex items-center justify-between text-slate-700">
                            <span>Co-signature N2 :</span>
                            <span className="font-bold text-slate-900">
                              {val.val_n2_bis ? `${val.val_n2_bis.prenom} ${val.val_n2_bis.nom}` : 'Valideur N2 Bis'} ({new Date(val.date_validation_n2_bis).toLocaleString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })})
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenPreview(val)}
                    className="w-full flex items-center justify-center gap-1.5 font-bold text-xs h-9 rounded-xl border border-slate-200 text-blue-900 bg-white hover:bg-slate-100 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-900" /> Voir les détails
                  </Button>
                  {canUserActOnItem(val) ? (
                    isApprovedPendingPayment ? (
                      <Button
                        onClick={() => handleOpenPayModal(val)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-10 rounded-xl gap-2 shadow-sm"
                      >
                        <DollarSign className="w-4 h-4 text-white" /> Payer la dépense (Trésorerie) <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleOpenDecisionModal(val)}
                        className="w-full bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-xs h-10 rounded-xl gap-2 shadow-sm"
                      >
                        <Shield className="w-4 h-4 text-amber-400" /> Statuer sur la soumission <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    )
                  ) : (
                    <div className="w-full h-10 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center gap-2 text-slate-500 font-bold text-xs">
                      <Shield className="w-3.5 h-3.5 text-slate-400" /> Action réservée aux valideurs autorisés
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL DE PAIEMENT / DECAISSEMENT (TRESORERIE) */}
      {payModalItem && (
        <Dialog open={!!payModalItem} onOpenChange={() => setPayModalItem(null)}>
          <DialogContent className="max-w-md bg-white rounded-3xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2 leading-snug">
                <DollarSign className="w-5 h-5 text-emerald-600" /> Effectuer le paiement : {payModalItem.titre_entite || 'Dépense'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Sélectionnez le compte financier / de trésorerie sur lequel prélever le montant et imputez le règlement.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleConfirmPay} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-700 block">Compte Bancaire / Caisse (Sortie d'argent) *</Label>
                  {selectedAccount && financialSummary?.encaisséParCompte && (
                    <span className="text-[10px] font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Solde : {Number((financialSummary.encaisséParCompte[selectedAccount] || 0) - (financialSummary.décaisseParCompte[selectedAccount] || 0)).toFixed(2)} $ CAD
                    </span>
                  )}
                </div>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  required
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-extrabold focus:ring-2 focus:ring-emerald-600"
                >
                  {treasuryAccounts.length === 0 ? (
                    <option value="">Aucun compte bancaire trouvé</option>
                  ) : (
                    treasuryAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.nom}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-700 block">Compte Analytique</Label>
                  {selectedCategory && financialSummary?.analyseParCategorie && (
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Solde Réserve : {Number(financialSummary.analyseParCategorie.find((c: any) => c.categorie === selectedCategory)?.soldeNet || 0).toFixed(2)} $ CAD
                    </span>
                  )}
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-extrabold focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="">Non spécifié / Trésorerie Générale</option>
                  {categories.map(cat => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs uppercase tracking-wider text-slate-700 block">Méthode de Paiement *</Label>
                <select
                  value={methodePaiement}
                  onChange={(e) => handleMethodeChange(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-extrabold focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="virement_bancaire">Virement Bancaire / Interac</option>
                  <option value="carte_credit">Carte de crédit de l'association</option>
                  <option value="cheque">Chèque</option>
                  <option value="especes">Comptant / Espèces</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="refTransaction" className="font-bold text-xs uppercase tracking-wider text-slate-700 block">
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
                  id="refTransaction"
                  value={refTransaction}
                  onChange={(e) => setRefTransaction(e.target.value)}
                  placeholder="ex: DEC-VIR-202609-0001"
                  className="h-11 rounded-xl border-slate-200 text-xs font-mono font-bold text-blue-950 bg-slate-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notesPaiement" className="font-bold text-xs uppercase tracking-wider text-slate-700 block">
                  Notes de Décaissement / Imputation (Optionnel)
                </Label>
                <Textarea
                  id="notesPaiement"
                  rows={2}
                  value={notesPaiement}
                  onChange={(e) => setNotesPaiement(e.target.value)}
                  placeholder="Précisions pour la comptabilité..."
                  className="rounded-xl text-xs border-slate-200"
                />
              </div>

              <DialogFooter className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPayModalItem(null)} className="font-bold rounded-xl text-xs">
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={submittingPay || !selectedAccount}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl px-5 text-xs h-10"
                >
                  {submittingPay ? 'Enregistrement...' : 'Confirmer le décaissement'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL DE DÉCISION DE VALIDATION */}
      {selectedValidation && (
        <Dialog open={!!selectedValidation} onOpenChange={() => setSelectedValidation(null)}>
          <DialogContent className="max-w-md bg-white rounded-3xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2 leading-snug">
                {getEntityIcon(selectedValidation.type_entite)} Décision : {selectedValidation.titre_entite || `Soumission ${selectedValidation.type_entite}`}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Statuez sur l&apos;approbation, demandez des révisions ou rejetez la soumission.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenPreview(selectedValidation)}
                className="w-full flex items-center justify-center gap-2 font-bold text-xs h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-blue-900"
              >
                <Eye className="w-4 h-4 text-blue-900" /> Voir les détails de la demande
              </Button>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs uppercase tracking-wider text-slate-700 block">Décision *</Label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as any)}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-extrabold focus:ring-2 focus:ring-blue-900"
                >
                  <option value="approuve">Approuver & Valider</option>
                  <option value="modifications_demandees">Demander des modifications</option>
                  <option value="rejete">Rejeter la demande</option>
                </select>
              </div>



              <div className="space-y-1.5">
                <Label htmlFor="commentaire" className="font-bold text-xs uppercase tracking-wider text-slate-700 block">
                  Commentaires & Consignes {decision !== 'approuve' && '*'}
                </Label>
                <Textarea
                  id="commentaire"
                  rows={3}
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder={decision === 'approuve' ? "Félicitations ou consignes d'exécution..." : "Précisez les motifs de rejet ou modifications..."}
                  className="rounded-xl text-xs border-slate-200"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSelectedValidation(null)} className="font-bold rounded-xl text-xs">
                Annuler
              </Button>
              <Button
                onClick={handleConfirmDecision}
                disabled={isSubmitting}
                className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-xl px-5 text-xs h-10"
              >
                {isSubmitting ? 'Enregistrement...' : 'Confirmer la décision'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL DE PRÉVISUALISATION DÉTAILLÉE DE L'ÉLÉMENT */}
      {previewItem && (
        <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
          <DialogContent className="max-w-2xl bg-white rounded-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                {getEntityIcon(previewItem.val.type_entite)} Fiche Détaillée : {previewItem.val.type_entite.toUpperCase()}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Examinez les informations complètes avant de prendre votre décision.
              </DialogDescription>
            </DialogHeader>

            {previewLoading ? (
              <p className="text-center py-8 text-slate-400 text-xs italic">Chargement de la fiche...</p>
            ) : !previewItem.details ? (
              <p className="text-center py-8 text-slate-400 text-xs italic">Élément introuvable ou supprimé.</p>
            ) : (
              <div className="space-y-6 pt-2">
                
                {/* 1. DÉTAILS ÉVÉNEMENT */}
                {previewItem.val.type_entite === 'evenement' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                      <h3 className="text-lg font-black text-blue-950">{previewItem.details.titre}</h3>
                      <p className="text-xs text-slate-600">{previewItem.details.description || 'Sans description.'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="p-3 border rounded-xl bg-slate-50">
                        <span className="text-slate-400 font-semibold block">Date & Heure :</span>
                        <span className="font-extrabold text-slate-900">
                          {new Date(previewItem.details.date_evenement).toLocaleString('fr-CA')}
                        </span>
                      </div>

                      <div className="p-3 border rounded-xl bg-slate-50">
                        <span className="text-slate-400 font-semibold block">Lieu / Format :</span>
                        <span className="font-extrabold text-slate-900 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-900" /> {previewItem.details.lieu} ({previewItem.details.format_evt})
                        </span>
                      </div>

                      <div className="p-3 border rounded-xl bg-slate-50">
                        <span className="text-slate-400 font-semibold block">Tarification :</span>
                        <span className="font-extrabold text-slate-900">
                          {previewItem.details.est_payant ? `${previewItem.details.prix} $ CAD` : 'Gratuit'}
                        </span>
                      </div>

                      <div className="p-3 border rounded-xl bg-slate-50">
                        <span className="text-slate-400 font-semibold block">Audience :</span>
                        <span className="font-extrabold text-blue-900 uppercase">
                          {previewItem.details.audience}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. DÉTAILS ARTICLE */}
                {previewItem.val.type_entite === 'article' && (
                  <div className="space-y-4">
                    {previewItem.details.image_couverture && (
                      <img src={previewItem.details.image_couverture} alt="Couverture" className="w-full h-48 object-cover rounded-2xl border" />
                    )}
                    <h3 className="text-xl font-black text-slate-900">{previewItem.details.titre}</h3>
                    <div className="p-4 rounded-2xl bg-slate-50 border text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
                      {previewItem.details.contenu}
                    </div>
                  </div>
                )}

                {/* 3. DÉTAILS VOTE */}
                {previewItem.val.type_entite === 'vote' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-black text-slate-900">{previewItem.details.titre}</h3>
                    <p className="text-xs text-slate-600">{previewItem.details.description}</p>
                    
                    <div className="space-y-1 pt-2">
                      <Label className="font-bold text-xs uppercase text-slate-700">Bulletins / Options au choix :</Label>
                      <div className="space-y-1.5">
                        {previewItem.details.options?.map((o: any) => (
                          <div key={o.id} className="p-2.5 rounded-xl border bg-slate-50 font-bold text-xs text-slate-800">
                            • {o.texte}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. DÉTAILS PARTENAIRE */}
                {previewItem.val.type_entite === 'partenaire' && (
                  <div className="space-y-4">
                    {previewItem.details.logo_url && (
                      <img src={previewItem.details.logo_url} alt="Logo" className="h-16 object-contain rounded-xl border p-2 bg-white" />
                    )}
                    <h3 className="text-xl font-black text-slate-900">{previewItem.details.nom}</h3>
                    <p className="text-xs text-slate-600">{previewItem.details.description}</p>
                    {previewItem.details.site_web && (
                      <a href={previewItem.details.site_web} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-900 font-bold hover:underline flex items-center gap-1">
                        Visiter le site web <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {/* 5. DÉTAILS DÉPENSE */}
                {previewItem.val.type_entite === 'depense' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">Demande de Dépense / Note de frais</span>
                        <h3 className="text-lg font-black text-slate-900 leading-snug">{previewItem.details.titre}</h3>
                        {previewItem.details.commissions?.nom && (
                          <span className="text-xs text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-block mt-1">
                            Commission : {previewItem.details.commissions.nom}
                          </span>
                        )}
                      </div>
                      <span className="text-xl font-extrabold text-emerald-700 shrink-0 bg-white px-3 py-1.5 rounded-xl border border-emerald-300">
                        {Number(previewItem.details.montant).toFixed(2)} $ CAD
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 border rounded-xl bg-slate-50">
                        <span className="text-slate-400 font-semibold block">Demandeur :</span>
                        <span className="font-extrabold text-slate-900">
                          {previewItem.details.profiles ? `${previewItem.details.profiles.prenom} ${previewItem.details.profiles.nom}` : 'Membre'}
                        </span>
                      </div>
                      <div className="p-3 border rounded-xl bg-slate-50">
                        <span className="text-slate-400 font-semibold block">Catégorie :</span>
                        <span className="font-extrabold text-blue-900 uppercase">
                          {previewItem.details.categorie || 'Non spécifiée'}
                        </span>
                      </div>
                    </div>

                    {previewItem.details.description && (
                      <div className="space-y-1">
                        <Label className="font-bold text-xs uppercase text-slate-700">Description / Justification :</Label>
                        <p className="text-xs text-slate-700 p-3 bg-slate-50 rounded-xl border leading-relaxed">{previewItem.details.description}</p>
                      </div>
                    )}

                    {previewItem.details.justificatif_url ? (
                      <div className="p-4 border border-blue-200 rounded-2xl bg-blue-50/40 space-y-2">
                        <span className="font-extrabold text-xs text-blue-950 block">Justificatif / Facture jointe :</span>
                        <a
                          href={previewItem.details.justificatif_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs text-white bg-blue-900 hover:bg-blue-950 font-bold px-4 py-2 rounded-xl shadow-sm"
                        >
                          <FileText className="w-4 h-4" /> Consulter la facture complète <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ) : (
                      <div className="p-3 border border-dashed rounded-xl text-center text-xs text-slate-400 italic">
                        Aucune facture ou pièce jointe téléchargée pour cette demande.
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            <DialogFooter className="pt-4 flex justify-end gap-2 border-t">
              <Button type="button" variant="outline" onClick={() => setPreviewItem(null)} className="font-bold rounded-xl text-xs">
                Fermer la prévisualisation
              </Button>
              <Button
                onClick={() => {
                  const val = previewItem?.val;
                  setPreviewItem(null);
                  if (val) handleOpenDecisionModal(val);
                }}
                className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-xl px-5 text-xs h-10 gap-1.5"
              >
                <Shield className="w-4 h-4 text-amber-400" /> Statuer sur cette demande
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
