'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Users, DollarSign, AlertTriangle, Plus, Trash2, CheckCircle2, Sliders, Bell, Mail, GitBranch, Clock, Vault, Edit3, X } from 'lucide-react';
import { getWorkflowSettings, updateWorkflowSettings, WorkflowSettings } from '@/app/actions/validation';
import { getAdhesionGraceSettings, updateAdhesionGraceSettings } from '@/app/actions/adhesion';
import { ensureSystemCommissionsExist } from '@/app/actions/commissions-workspace';
import { addCommissionMember, removeCommissionMember, deleteCommission } from '@/app/actions/commission';
import { getPaymentCategories, savePaymentCategories, getTreasuryAccounts, saveTreasuryAccounts, TreasuryAccount } from '@/app/actions/finances';

interface Profile {
  id: string;
  prenom: string;
  nom: string;
}

interface Commission {
  id: string;
  nom: string;
  description: string | null;
  objectifs: string | null;
  responsable_id: string | null;
  responsable_adjoint_id: string | null;
  est_systeme?: boolean;
  budget_annuel?: number | null;
}

interface BureauAssignment {
  id?: string;
  profile_id: string;
  role_bureau: string;
  titre_personnalise?: string | null;
}

export default function ConfigurationPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [bureau, setBureau] = useState<BureauAssignment[]>([]);

  // Commission Members State
  const [commMembers, setCommMembers] = useState<any[]>([]);
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Membre statutaire');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<'bureau' | 'ca' | 'commissions' | 'finances' | 'workflows'>('bureau');

  // Finance & Solidarity & Grace Period settings state
  const [cotisationMontant, setCotisationMontant] = useState(50.0);
  const [delaiGraceAdhesion, setDelaiGraceAdhesion] = useState(14);
  const [delaiGraceRenouvellement, setDelaiGraceRenouvellement] = useState(14);
  const [fondsSeuilMax, setFondsSeuilMax] = useState(500.0);
  const [fondsCriteres, setFondsCriteres] = useState('');
  const [fondsProcessus, setFondsProcessus] = useState('');
  const [fondsReddition, setFondsReddition] = useState('');

  // Payment Categories State
  const [paymentCategories, setPaymentCategories] = useState<{ key: string; label: string }[]>([]);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');

  // Treasury Accounts State
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([]);
  const [editingAccount, setEditingAccount] = useState<TreasuryAccount | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountForm, setAccountForm] = useState<Partial<TreasuryAccount>>({
    nom: '',
    type: 'banque',
    institution: '',
    numero_compte: '',
    transit_routing: '',
    solde_initial: 0,
    devise: 'CAD',
    description: '',
    est_defaut: false,
    actif: true,
  });

  // Workflow Settings State
  const [workflowSettings, setWorkflowSettings] = useState<WorkflowSettings>({
    require_commission_prevalidation: true,
    validation_depenses_mode: 'double',
    validation_depenses_seuil_n2: 100,
    validation_evenements_niveau: 1,
    validation_articles_niveau: 1,
    validation_votes_niveau: 1,
    validation_partenaires_niveau: 1,
    notify_email_on_approval: true,
    notify_app_on_approval: true,
  });

  // Form State for creating custom bureau role or conseiller
  const [selectedProfileCustom, setSelectedProfileCustom] = useState('');
  const [customRoleType, setCustomRoleType] = useState('conseiller');
  const [customTitle, setCustomTitle] = useState('');

  // Logged in user authorization state
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userGlobalRole, setUserGlobalRole] = useState<string>('');

  // Selected Commission to Edit
  const [selectedComm, setSelectedComm] = useState<Commission | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userProf } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (userProf) setUserGlobalRole(userProf.role);

      const { data: userBur } = await supabase
        .from('bureau_gouvernance')
        .select('role_bureau')
        .eq('profile_id', user.id);
      if (userBur) {
        const roles = userBur.map(b => b.role_bureau);
        setUserRoles(roles);

        const isSuperadmin = userProf?.role === 'superadmin';
        const isPres = roles.includes('president') || roles.includes('vice_president') || isSuperadmin;
        const isSec = roles.includes('secretaire');
        
        if (isPres) setActiveTab('bureau');
        else if (isSec) setActiveTab('ca');
        else setActiveTab('finances');
      }
    }

    const { data: profs } = await supabase
      .from('profiles')
      .select('id, prenom, nom')
      .order('nom', { ascending: true });

    try {
      await ensureSystemCommissionsExist();
    } catch (e) {
      console.warn("ensureSystemCommissionsExist warning:", e);
    }

    let comms = null;
    const { data: commsData, error: commsErr } = await supabase
      .from('commissions')
      .select('*')
      .order('nom', { ascending: true });

    if (!commsErr && commsData) {
      comms = commsData;
    }

    const { data: burData } = await supabase
      .from('bureau_gouvernance')
      .select('*');

    const { data: settings } = await supabase
      .from('settings_association')
      .select('*');

    // Fetch Workflow & Grace Settings
    const wf = await getWorkflowSettings();
    setWorkflowSettings(wf);

    const graceSettings = await getAdhesionGraceSettings();
    setDelaiGraceAdhesion(graceSettings.delai_grace_adhesion_jours);
    setDelaiGraceRenouvellement(graceSettings.delai_grace_renouvellement_jours);

    const payCats = await getPaymentCategories();
    setPaymentCategories(payCats);

    const tresAccs = await getTreasuryAccounts();
    setTreasuryAccounts(tresAccs);

    if (profs) setProfiles(profs);
    if (comms) setCommissions(comms);
    if (burData) setBureau(burData);

    if (settings) {
      const cotSetting = settings.find(s => s.key === 'cotisation_annuelle');
      if (cotSetting) {
        setCotisationMontant(cotSetting.value.montant);
      }
      const fondsSetting = settings.find(s => s.key === 'fonds_solidarite');
      if (fondsSetting) {
        setFondsSeuilMax(fondsSetting.value.seuil_max);
        setFondsCriteres(fondsSetting.value.critere_eligibilite || '');
        setFondsProcessus(fondsSetting.value.processus_analyse || '');
        setFondsReddition(fondsSetting.value.reddition_comptes || '');
      }
    }

    setLoading(false);
  };

  const getRoleProfileId = (role: string) => {
    return bureau.find(b => b.role_bureau === role)?.profile_id || '';
  };

  const handleAssignRole = async (role: string, profileId: string) => {
    if (!profileId || profileId === 'none') {
      await supabase
        .from('bureau_gouvernance')
        .delete()
        .eq('role_bureau', role);
    } else {
      const { error } = await supabase
        .from('bureau_gouvernance')
        .upsert({
          profile_id: profileId,
          role_bureau: role,
        }, { onConflict: 'profile_id,role_bureau' });
      if (error) console.error(error);
    }
    fetchData();
  };

  const handleAddCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileCustom) return;

    const { error } = await supabase
      .from('bureau_gouvernance')
      .insert({
        profile_id: selectedProfileCustom,
        role_bureau: customRoleType,
        titre_personnalise: customTitle || null
      });

    if (!error) {
      setSelectedProfileCustom('');
      setCustomTitle('');
      fetchData();
    } else {
      console.error(error);
      alert("Erreur lors de l'attribution du rôle optionnel.");
    }
  };

  const handleDeleteAssignment = async (id?: string) => {
    if (!id) return;
    const { error } = await supabase
      .from('bureau_gouvernance')
      .delete()
      .eq('id', id);

    if (!error) {
      fetchData();
    }
  };

  const handleSaveCommissionRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComm) return;

    const { error } = await supabase
      .from('commissions')
      .update({
        responsable_id: selectedComm.responsable_id || null,
        responsable_adjoint_id: selectedComm.responsable_adjoint_id || null,
        nom: selectedComm.nom,
        description: selectedComm.description,
        objectifs: selectedComm.objectifs,
        budget_annuel: typeof selectedComm.budget_annuel === 'number' ? selectedComm.budget_annuel : parseFloat(String(selectedComm.budget_annuel || 0)) || 0,
      })
      .eq('id', selectedComm.id);

    if (!error) {
      alert("Paramètres de la commission enregistrés !");
      fetchData();
    } else {
      console.error(error);
      alert("Erreur lors de l'enregistrement.");
    }
  };

  const fetchCommissionMembers = async (commId: string) => {
    const { data } = await supabase
      .from('commission_membres')
      .select(`
        id,
        role_commission,
        profile_id,
        profiles:profile_id (
          id, prenom, nom, email
        )
      `)
      .eq('commission_id', commId)
      .eq('actif', true);
    setCommMembers(data || []);
  };

  const handleSelectCommission = (c: Commission) => {
    setSelectedComm(c);
    fetchCommissionMembers(c.id);
  };

  const handleAddMemberToComm = async () => {
    if (!selectedComm || !newMemberId) return;
    setIsAddingMember(true);
    const res = await addCommissionMember(selectedComm.id, newMemberId, newMemberRole || 'Membre statutaire');
    setIsAddingMember(false);
    if ('success' in res && res.success) {
      setNewMemberId('');
      setNewMemberRole('Membre statutaire');
      fetchCommissionMembers(selectedComm.id);
    } else {
      alert('error' in res ? res.error : "Erreur lors de l'ajout du membre.");
    }
  };

  const handleRemoveMemberFromComm = async (profileId: string) => {
    if (!selectedComm) return;
    if (confirm("Retirer ce membre de la commission ?")) {
      const res = await removeCommissionMember(selectedComm.id, profileId);
      if ('success' in res && res.success) {
        fetchCommissionMembers(selectedComm.id);
      } else {
        alert('error' in res ? res.error : "Erreur lors du retrait du membre.");
      }
    }
  };

  const handleDeleteCommission = async () => {
    if (!selectedComm) return;
    const EXACT_SYSTEM_NAMES = [
      'Communication & Marketing',
      'Relations Publiques & Partenariats',
      'Événements & Intégration',
      'Entraide, Inclusion & Solidarité'
    ];
    if (selectedComm.est_systeme || EXACT_SYSTEM_NAMES.includes(selectedComm.nom)) {
      alert("Les 4 commissions système statutaires de Synergie UQO ne peuvent pas être supprimées.");
      return;
    }
    if (confirm(`Voulez-vous vraiment supprimer la commission "${selectedComm.nom}" ?`)) {
      const res = await deleteCommission(selectedComm.id);
      if ('success' in res && res.success) {
        alert("Commission supprimée avec succès.");
        setSelectedComm(null);
        fetchData();
      } else {
        alert('error' in res ? res.error : "Erreur lors de la suppression de la commission.");
      }
    }
  };

  const handleSaveFinanceSettings = async () => {
    const { error: err1 } = await supabase
      .from('settings_association')
      .upsert({
        key: 'cotisation_annuelle',
        value: { montant: cotisationMontant, devise: 'CAD' }
      });

    const { error: err2 } = await supabase
      .from('settings_association')
      .upsert({
        key: 'fonds_solidarite',
        value: {
          seuil_max: fondsSeuilMax,
          devise: 'CAD',
          critere_eligibilite: fondsCriteres,
          processus_analyse: fondsProcessus,
          reddition_comptes: fondsReddition
        }
      });

    if (!err1 && !err2) {
      alert("Paramètres financiers enregistrés avec succès !");
      fetchData();
    } else {
      alert("Erreur lors de l'enregistrement des paramètres financiers.");
    }
  };

  const [savingWorkflows, setSavingWorkflows] = useState(false);
  const [workflowSaveStatus, setWorkflowSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSaveWorkflows = async (updatedSettings?: WorkflowSettings) => {
    const target = updatedSettings || workflowSettings;
    setSavingWorkflows(true);
    setWorkflowSaveStatus('saving');
    const res = await updateWorkflowSettings(target);
    setSavingWorkflows(false);
    if (res.success) {
      setWorkflowSaveStatus('saved');
      setTimeout(() => setWorkflowSaveStatus('idle'), 3000);
      fetchData();
    } else {
      setWorkflowSaveStatus('error');
      alert("Erreur lors de la sauvegarde des règles de workflow.");
    }
  };

  const caMembers = bureau.filter(b => b.role_bureau === 'administrateur_ca');
  const hasCaWarning = caMembers.length < 5;

  const isSuperadmin = userGlobalRole === 'superadmin';
  const isPresident = userRoles.includes('president') || userRoles.includes('vice_president') || isSuperadmin;
  const isSec = userRoles.includes('secretaire');
  const isTres = userRoles.includes('tresorier');

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-500 absolute top-0 left-0 right-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 text-blue-900 rounded-2xl">
                <Sliders className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Configuration & Gouvernance</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Gérez les structures de gouvernance, l&apos;affectation du bureau exécutif, les commissions, les flux de validation et les paramètres financiers.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-center py-16">Chargement de la configuration...</p>
      ) : (
        <div className="space-y-6 w-full">
          
          {/* BARRE D'ONGLETS STYLISÉE ET PLEINE LARGEUR */}
          <div className="bg-slate-100/90 p-1.5 rounded-2xl flex flex-wrap gap-2 border border-slate-200/80 shadow-sm w-full">
            {isPresident && (
              <button
                type="button"
                onClick={() => setActiveTab('bureau')}
                className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === 'bureau'
                    ? 'bg-white text-blue-950 shadow-md border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Shield className="w-4 h-4 text-blue-900" /> Le Bureau Exécutif
              </button>
            )}
            {(isPresident || isSec) && (
              <button
                type="button"
                onClick={() => setActiveTab('ca')}
                className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === 'ca'
                    ? 'bg-white text-blue-950 shadow-md border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Shield className="w-4 h-4 text-amber-500" /> Conseil d&apos;Administration
              </button>
            )}
            {(isPresident || isSec) && (
              <button
                type="button"
                onClick={() => setActiveTab('commissions')}
                className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === 'commissions'
                    ? 'bg-white text-blue-950 shadow-md border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Users className="w-4 h-4 text-blue-900" /> Commissions
              </button>
            )}
            {isPresident && (
              <button
                type="button"
                onClick={() => setActiveTab('workflows')}
                className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === 'workflows'
                    ? 'bg-white text-blue-950 shadow-md border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <GitBranch className="w-4 h-4 text-amber-500" /> Flux de Validation
              </button>
            )}
            {(isPresident || isTres) && (
              <button
                type="button"
                onClick={() => setActiveTab('finances')}
                className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === 'finances'
                    ? 'bg-white text-blue-950 shadow-md border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-600" /> Finances & Cotisations
              </button>
            )}
          </div>

          {/* CONTENU : ONGLET LE BUREAU EXÉCUTIF */}
          {activeTab === 'bureau' && isPresident && (
            <div className="space-y-8 w-full">
              <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
                <div className="h-1.5 bg-blue-900" />
                <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-900" /> Le Bureau Exécutif (Postes Statutaires Obligatoires)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Désignez les membres titulaires aux rôles exécutifs majeurs de l&apos;association.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Présidence */}
                    <div className="space-y-2 p-5 border border-slate-150 rounded-2xl bg-slate-50/30">
                      <Label htmlFor="president" className="font-extrabold text-xs uppercase tracking-wider text-slate-800 block">Présidence *</Label>
                      <select
                        id="president"
                        value={getRoleProfileId('president')}
                        onChange={(e) => handleAssignRole('president', e.target.value)}
                        className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-blue-900 shadow-sm"
                      >
                        <option value="">-- Choisir un membre --</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                        ))}
                      </select>
                    </div>

                    {/* Vice-Présidence */}
                    <div className="space-y-2 p-5 border border-slate-150 rounded-2xl bg-slate-50/30">
                      <Label htmlFor="vice_president" className="font-extrabold text-xs uppercase tracking-wider text-slate-800 block">Vice-Présidence *</Label>
                      <select
                        id="vice_president"
                        value={getRoleProfileId('vice_president')}
                        onChange={(e) => handleAssignRole('vice_president', e.target.value)}
                        className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-blue-900 shadow-sm"
                      >
                        <option value="">-- Choisir un membre --</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                        ))}
                      </select>
                    </div>

                    {/* Secrétariat */}
                    <div className="space-y-2 p-5 border border-slate-150 rounded-2xl bg-slate-50/30">
                      <Label htmlFor="secretaire" className="font-extrabold text-xs uppercase tracking-wider text-slate-800 block">Secrétariat Général *</Label>
                      <select
                        id="secretaire"
                        value={getRoleProfileId('secretaire')}
                        onChange={(e) => handleAssignRole('secretaire', e.target.value)}
                        className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-blue-900 shadow-sm"
                      >
                        <option value="">-- Choisir un membre --</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                        ))}
                      </select>
                    </div>

                    {/* Trésorerie */}
                    <div className="space-y-2 p-5 border border-slate-150 rounded-2xl bg-slate-50/30">
                      <Label htmlFor="tresorier" className="font-extrabold text-xs uppercase tracking-wider text-slate-800 block">Trésorerie Générale *</Label>
                      <select
                        id="tresorier"
                        value={getRoleProfileId('tresorier')}
                        onChange={(e) => handleAssignRole('tresorier', e.target.value)}
                        className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-blue-900 shadow-sm"
                      >
                        <option value="">-- Choisir un membre --</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                        ))}
                      </select>
                    </div>

                  </div>
                </CardContent>
              </Card>

              {/* Rôles Optionnels / Conseillers */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white lg:col-span-1 h-fit overflow-hidden">
                  <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-base font-extrabold text-slate-900">Attribuer un rôle adjoint</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <form onSubmit={handleAddCustomRole} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Membre *</Label>
                        <select
                          value={selectedProfileCustom}
                          onChange={(e) => setSelectedProfileCustom(e.target.value)}
                          className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-blue-900 shadow-sm"
                          required
                        >
                          <option value="">-- Choisir un membre --</option>
                          {profiles.map(p => (
                            <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Nature du Rôle</Label>
                        <select
                          value={customRoleType}
                          onChange={(e) => setCustomRoleType(e.target.value)}
                          className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-blue-900 shadow-sm"
                        >
                          <option value="responsable_comm">Responsable Communication</option>
                          <option value="responsable_partenariat">Responsable Partenariats</option>
                          <option value="conseiller">Conseiller Spécial</option>
                          <option value="responsable_dossier">Responsable de dossiers</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="customTitle" className="font-bold text-xs uppercase tracking-wider text-slate-700">Titre personnalisé (Optionnel)</Label>
                        <Input
                          id="customTitle"
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                          placeholder="Ex: Conseiller aux affaires étudiantes"
                          className="h-10 rounded-xl border-slate-200 text-xs"
                        />
                      </div>

                      <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold h-10 rounded-xl shadow-md">
                        <Plus className="w-4 h-4 mr-1.5" /> Assigner au bureau
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Rôles assignés */}
                <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white lg:col-span-2 overflow-hidden">
                  <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-base font-extrabold text-slate-900">Rôles Adjoints & Conseillers Affectés</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 divide-y divide-slate-100">
                    {bureau.filter(b => !['president', 'vice_president', 'secretaire', 'tresorier', 'administrateur_ca'].includes(b.role_bureau)).length === 0 ? (
                      <p className="text-slate-400 text-center py-10 text-xs italic">Aucun rôle optionnel affecté pour le moment.</p>
                    ) : (
                      bureau
                        .filter(b => !['president', 'vice_president', 'secretaire', 'tresorier', 'administrateur_ca'].includes(b.role_bureau))
                        .map((bur: any) => {
                          const prof = profiles.find(p => p.id === bur.profile_id);
                          return (
                            <div key={bur.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                              <div>
                                <span className="font-extrabold text-slate-900 text-sm block">
                                  {prof ? `${prof.prenom} ${prof.nom}` : 'Membre inconnu'}
                                </span>
                                <span className="text-xs text-slate-500 font-medium capitalize">
                                  {bur.role_bureau.replace('_', ' ')} {bur.titre_personnalise ? `— "${bur.titre_personnalise}"` : ''}
                                </span>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 text-red-650 hover:bg-red-50 rounded-xl"
                                onClick={() => handleDeleteAssignment(bur.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          );
                        })
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* CONTENU : ONGLET CONSEIL D'ADMINISTRATION */}
          {activeTab === 'ca' && (isPresident || isSec) && (
            <div className="space-y-8 w-full">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white lg:col-span-1 h-fit overflow-hidden">
                  <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-base font-extrabold text-slate-900">Ajouter un Administrateur (CA)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!selectedProfileCustom) return;
                      const { error } = await supabase
                        .from('bureau_gouvernance')
                        .insert({
                          profile_id: selectedProfileCustom,
                          role_bureau: 'administrateur_ca'
                        });
                      if (!error) {
                        setSelectedProfileCustom('');
                        fetchData();
                      } else {
                        console.error(error);
                        alert("Erreur lors de l'ajout de l'administrateur.");
                      }
                    }} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Sélectionner le membre *</Label>
                        <select
                          value={selectedProfileCustom}
                          onChange={(e) => setSelectedProfileCustom(e.target.value)}
                          className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-blue-900 shadow-sm"
                          required
                        >
                          <option value="">-- Choisir un membre --</option>
                          {profiles.map(p => (
                            <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                          ))}
                        </select>
                      </div>
                      <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold h-11 rounded-xl shadow-md">
                        <Plus className="w-4 h-4 mr-1.5" /> Nommer Administrateur CA
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Administrateurs Actuels */}
                <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white lg:col-span-2 overflow-hidden">
                  <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-extrabold text-slate-900">Composition du Conseil d&apos;Administration (CA)</CardTitle>
                    <span className="text-xs bg-amber-100 text-amber-900 font-bold px-3 py-1 rounded-full">
                      {caMembers.length} Administrateur(s)
                    </span>
                  </CardHeader>
                  <CardContent className="p-0 divide-y divide-slate-100">
                    {caMembers.length === 0 ? (
                      <p className="text-slate-400 text-center py-10 text-xs italic">Aucun administrateur désigné pour le moment.</p>
                    ) : (
                      caMembers.map((bur: any) => {
                        const prof = profiles.find(p => p.id === bur.profile_id);
                        return (
                          <div key={bur.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                            <div>
                              <span className="font-extrabold text-slate-900 text-sm block">
                                {prof ? `${prof.prenom} ${prof.nom}` : 'Membre inconnu'}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                Administrateur statutaire du CA
                              </span>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-red-650 hover:bg-red-50 rounded-xl"
                              onClick={() => handleDeleteAssignment(bur.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Indication de quorum */}
              <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white overflow-hidden p-6">
                <div className="flex items-center gap-4 p-5 rounded-2xl border bg-slate-50/50">
                  {hasCaWarning ? (
                    <>
                      <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
                      <div className="text-xs text-slate-700 leading-relaxed">
                        <span className="font-extrabold text-slate-900 block text-sm">Composition sous le seuil statutaire</span>
                        Le Conseil d&apos;Administration requiert idéalement 5 membres minimum. Vous en avez actuellement <strong>{caMembers.length}</strong>.
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                      <div className="text-xs text-slate-700 leading-relaxed">
                        <span className="font-extrabold text-slate-900 block text-sm">Conseil d&apos;Administration Valide</span>
                        La taille statutaire est respectée avec <strong>{caMembers.length}</strong> administrateurs désignés.
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* CONTENU : ONGLET COMMISSIONS */}
          {activeTab === 'commissions' && (isPresident || isSec) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
              {/* Liste des commissions */}
              <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white lg:col-span-1 overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-extrabold text-slate-900">Commissions Actives</CardTitle>
                    <CardDescription className="text-[11px] text-slate-500">Commissions système permanentes et ad hoc.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-100">
                  {commissions.map(c => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCommission(c)}
                      className={`p-5 cursor-pointer transition-colors ${
                        selectedComm?.id === c.id ? 'bg-blue-50/60 border-l-4 border-blue-900 font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-900 text-sm block">{c.nom}</span>
                        {c.est_systeme && (
                          <span className="text-[9px] bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-full border border-amber-200 uppercase shrink-0">
                            🔒 Système
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 line-clamp-1 mt-0.5">{c.description || 'Sans description'}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Éditeur de commission */}
              <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white lg:col-span-2 overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-base font-extrabold text-slate-900">
                    {selectedComm ? `Configurer : ${selectedComm.nom}` : 'Sélectionnez une commission'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {selectedComm ? (
                    <form onSubmit={handleSaveCommissionRoles} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="commNom" className="font-bold text-xs uppercase tracking-wider text-slate-700">Nom de la commission *</Label>
                        <Input
                          id="commNom"
                          required
                          value={selectedComm.nom}
                          onChange={(e) => setSelectedComm({ ...selectedComm, nom: e.target.value })}
                          className="h-11 rounded-xl border-slate-200"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="commDesc" className="font-bold text-xs uppercase tracking-wider text-slate-700">Description</Label>
                        <Textarea
                          id="commDesc"
                          rows={3}
                          value={selectedComm.description || ''}
                          onChange={(e) => setSelectedComm({ ...selectedComm, description: e.target.value })}
                          className="rounded-xl text-xs border-slate-200"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="commObj" className="font-bold text-xs uppercase tracking-wider text-slate-700">Objectifs généraux</Label>
                        <Textarea
                          id="commObj"
                          rows={3}
                          value={selectedComm.objectifs || ''}
                          onChange={(e) => setSelectedComm({ ...selectedComm, objectifs: e.target.value })}
                          className="rounded-xl text-xs border-slate-200"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div className="space-y-1.5">
                          <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Responsable Principal</Label>
                          <select
                            value={selectedComm.responsable_id || ''}
                            onChange={(e) => setSelectedComm({ ...selectedComm, responsable_id: e.target.value || null })}
                            className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-blue-900 shadow-sm"
                          >
                            <option value="">-- Non désigné --</option>
                            {profiles.map(p => (
                              <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Responsable Adjoint</Label>
                          <select
                            value={selectedComm.responsable_adjoint_id || ''}
                            onChange={(e) => setSelectedComm({ ...selectedComm, responsable_adjoint_id: e.target.value || null })}
                            className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-blue-900 shadow-sm"
                          >
                            <option value="">-- Non désigné --</option>
                            {profiles.map(p => (
                              <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="commBudget" className="font-bold text-xs uppercase tracking-wider text-slate-700">Budget Annuel ($ CAD)</Label>
                          <Input
                            id="commBudget"
                            type="number"
                            step="0.01"
                            min="0"
                            value={selectedComm.budget_annuel ?? 0}
                            onChange={(e) => setSelectedComm({ ...selectedComm, budget_annuel: parseFloat(e.target.value) || 0 })}
                            className="h-11 rounded-xl border-slate-200 text-xs font-bold"
                          />
                        </div>
                      </div>

                      {/* Section Gestion des Membres rattachés */}
                      <div className="pt-4 border-t border-slate-100 space-y-3">
                        <Label className="font-extrabold text-xs uppercase tracking-wider text-slate-800 block">
                          Membres rattachés à la commission ({commMembers.length})
                        </Label>

                        {/* Membres actuels */}
                        {commMembers.length > 0 && (
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {commMembers.map((cm: any) => {
                              const prof = cm.profiles;
                              if (!prof) return null;
                              return (
                                <div key={cm.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                                  <div>
                                    <span className="font-bold text-slate-900">{prof.prenom} {prof.nom}</span>
                                    <span className="text-slate-500 text-[11px] block">{cm.role_commission || 'Membre statutaire'} • {prof.email}</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMemberFromComm(cm.profile_id)}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 px-2 rounded-lg"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Formulaire d'ajout d'un membre */}
                        <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3">
                          <span className="text-xs font-bold text-slate-800 block">Ajouter un nouveau membre</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                              value={newMemberId}
                              onChange={(e) => setNewMemberId(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-blue-900"
                            >
                              <option value="">-- Sélectionner un membre --</option>
                              {profiles
                                .filter(p => !commMembers.some(cm => cm.profile_id === p.id))
                                .map(p => (
                                  <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                                ))}
                            </select>
                            <Input
                              placeholder="Rôle (ex: Membre statutaire)"
                              value={newMemberRole}
                              onChange={(e) => setNewMemberRole(e.target.value)}
                              className="h-10 text-xs rounded-xl border-slate-200"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={handleAddMemberToComm}
                            disabled={!newMemberId || isAddingMember}
                            className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs h-9 rounded-xl gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> {isAddingMember ? "Ajout en cours..." : "Ajouter ce membre à la commission"}
                          </Button>
                        </div>
                      </div>

                      {/* Actions: Enregistrer & Supprimer */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                        <Button type="submit" className="bg-blue-900 hover:bg-blue-950 text-white font-bold h-11 rounded-xl px-6">
                          Enregistrer la commission
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleDeleteCommission}
                          className="h-11 rounded-xl px-4 text-xs font-bold gap-1.5"
                        >
                          <Trash2 className="w-4 h-4" /> Supprimer la commission
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-slate-400 text-center py-16 text-xs italic">
                      Cliquez sur une commission dans la liste à gauche pour modifier ses responsables et objectifs.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* CONTENU : ONGLET CONFIGURATION DES FLUX DE VALIDATION */}
          {activeTab === 'workflows' && isPresident && (
            <div className="space-y-8 w-full">

              {/* BARRE DE STATUT ET SAUVEGARDE EN DIRECT */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900 text-white rounded-3xl shadow-md">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-sm block flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" /> Matrice des Circuits d&apos;Approbation & Gouvernance
                  </span>
                  <span className="text-xs text-slate-300">
                    Définissez le nombre de niveaux d&apos;examen requis et les valideurs désignés avant publication ou décaissement.
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {workflowSaveStatus === 'saving' && (
                    <span className="text-xs text-amber-300 font-bold animate-pulse">Enregistrement en cours...</span>
                  )}
                  {workflowSaveStatus === 'saved' && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Modifications enregistrées !
                    </span>
                  )}
                  {workflowSaveStatus === 'error' && (
                    <span className="text-xs text-red-400 font-bold">Erreur de sauvegarde</span>
                  )}
                  <Button
                    onClick={() => handleSaveWorkflows()}
                    disabled={savingWorkflows}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs h-10 rounded-xl px-5 shadow-sm"
                  >
                    {savingWorkflows ? 'Sauvegarde...' : 'Enregistrer la Gouvernance'}
                  </Button>
                </div>
              </div>

              {/* 1. PRÉ-VALIDATION PAR LES COMMISSIONS (EXCLUSIF NOTES DE FRAIS PROJET) */}
              <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
                <div className="h-1.5 bg-blue-900" />
                <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-900" /> Pré-Validation Statutaire par les Commissions
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Détermine si une dépense issue d&apos;un projet de commission doit d&apos;abord être pré-approuvée par son responsable avant d&apos;entrer dans le circuit financier global.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start space-x-4 p-5 rounded-2xl border bg-slate-50/50">
                    <Checkbox
                      id="prevalComm"
                      checked={workflowSettings.require_commission_prevalidation !== false}
                      onCheckedChange={(checked) => {
                        setWorkflowSettings({ ...workflowSettings, require_commission_prevalidation: checked === true });
                      }}
                      className="w-5 h-5 mt-0.5"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="prevalComm" className="cursor-pointer font-extrabold text-sm text-slate-900 block">
                        Exiger la pré-validation par le Responsable / Adjoint de Commission
                      </Label>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Toute note de frais soumise par un membre de commission est placée au statut <strong>&quot;en attente de pré-validation commission&quot;</strong>. Le Responsable de commission vérifie qu&apos;elle correspond au budget alloué.
                      </p>
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 font-medium space-y-1">
                        <span className="font-extrabold block">⚡ Règle d&apos;exemption automatique pour les Responsables & Adjoints :</span>
                        <span>
                          Lorsque la demande est soumise directement par le <strong>Responsable de commission</strong> ou son <strong>Adjoint</strong>, elle est réputée <strong>pré-autorisée d&apos;office</strong> et passe immédiatement au circuit financier global (Trésorerie N1).
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. MATRICE DE GOUVERNANCE PAR MODULE */}
              <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-amber-500" /> Matrice des Circuits d&apos;Approbation par Module
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Définissez la chaîne explicite des valideurs (Niveau 1 et Niveau 2) pour chaque module de l&apos;application.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[11px] font-extrabold uppercase text-slate-600 border-b border-slate-200/80">
                          <th className="py-4 px-6 w-[25%]">Module / Contenu</th>
                          <th className="py-4 px-4 w-[25%]">Examen Niveau 1 (N1)</th>
                          <th className="py-4 px-4 w-[25%]">Examen Niveau 2 (N2)</th>
                          <th className="py-4 px-6 w-[25%]">Niveau Global Requis</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        
                        {(() => {
                          const availableRoles = [
                            { key: 'president', label: 'Présidence / Bureau Exécutif' },
                            { key: 'vice_president', label: 'Vice-Présidence' },
                            { key: 'tresorier', label: 'Trésorier Général' },
                            { key: 'secretaire', label: 'Secrétaire Général' },
                            { key: 'responsable_com', label: 'Responsable Communication' },
                            { key: 'responsable_partenariats', label: 'Responsable Partenariats' },
                            { key: 'responsable_commission', label: 'Responsable Commission / Org.' },
                            { key: 'admin_ca', label: 'Tout Administrateur CA' },
                          ];

                          const renderRoleSelector = (
                            currentRoles: string[] = [],
                            onChange: (newRoles: string[]) => void,
                            bgBadgeClass: string,
                            isDoubleValidation: boolean = false,
                            onToggleDoubleValidation?: (checked: boolean) => void
                          ) => {
                            return (
                              <div className="space-y-2 py-1">
                                <div className="flex flex-wrap gap-1">
                                  {currentRoles.length === 0 && (
                                    <span className="text-[10px] text-slate-400 italic">Aucun rôle (Admin par défaut)</span>
                                  )}
                                  {currentRoles.map((rKey) => {
                                    const rObj = availableRoles.find(a => a.key === rKey);
                                    return (
                                      <span
                                        key={rKey}
                                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${bgBadgeClass}`}
                                      >
                                        {rObj ? rObj.label : rKey}
                                        <button
                                          type="button"
                                          onClick={() => onChange(currentRoles.filter(r => r !== rKey))}
                                          className="hover:text-red-600 ml-0.5"
                                        >
                                          ×
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>

                                <select
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value && !currentRoles.includes(e.target.value)) {
                                      onChange([...currentRoles, e.target.value]);
                                    }
                                  }}
                                  className="h-8 px-2 border border-slate-200 rounded-lg text-[11px] bg-slate-50 font-bold text-slate-700 focus:ring-1 focus:ring-blue-900 w-full"
                                >
                                  <option value="">+ Autoriser un rôle...</option>
                                  {availableRoles
                                    .filter(r => !currentRoles.includes(r.key))
                                    .map(r => (
                                      <option key={r.key} value={r.key}>{r.label}</option>
                                    ))}
                                </select>

                                {onToggleDoubleValidation && (
                                  <label className="flex items-center gap-1.5 pt-1 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={isDoubleValidation}
                                      onChange={(e) => onToggleDoubleValidation(e.target.checked)}
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                                    />
                                    <span className="text-[10px] font-extrabold text-slate-700">
                                      Exiger 2 validations minimum à ce niveau
                                    </span>
                                  </label>
                                )}
                              </div>
                            );
                          };

                          return (
                            <>
                              {/* Module 1 : Notes de frais */}
                              <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-6">
                                  <span className="font-extrabold text-slate-900 text-sm block">Notes de Frais & Dépenses (Examen)</span>
                                  <span className="text-[11px] text-slate-500">Approbation des montants & justificatifs</span>
                                </td>
                                <td className="py-3 px-4">
                                  {renderRoleSelector(
                                    workflowSettings.roles_n1_depenses || ['tresorier', 'vice_president'],
                                    (roles) => setWorkflowSettings({ ...workflowSettings, roles_n1_depenses: roles }),
                                    'bg-emerald-50 text-emerald-800 border-emerald-200',
                                    !!workflowSettings.double_validation_n1_depenses,
                                    (checked) => setWorkflowSettings({ ...workflowSettings, double_validation_n1_depenses: checked })
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {renderRoleSelector(
                                    workflowSettings.roles_n2_depenses || ['president', 'vice_president'],
                                    (roles) => setWorkflowSettings({ ...workflowSettings, roles_n2_depenses: roles }),
                                    'bg-blue-50 text-blue-900 border-blue-200',
                                    !!workflowSettings.double_validation_n2_depenses,
                                    (checked) => setWorkflowSettings({ ...workflowSettings, double_validation_n2_depenses: checked })
                                  )}
                                </td>
                                <td className="py-4 px-6">
                                  <div className="space-y-2">
                                    <select
                                      value={workflowSettings.validation_depenses_mode === 'simple' ? 1 : 2}
                                      onChange={(e) => {
                                        const is2Levels = parseInt(e.target.value) === 2;
                                        setWorkflowSettings({ 
                                          ...workflowSettings, 
                                          validation_depenses_mode: is2Levels ? 'seuil' : 'simple' 
                                        });
                                      }}
                                      className="h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-900 shadow-sm w-full"
                                    >
                                      <option value={1}>1 Niveau (Validation simple)</option>
                                      <option value={2}>2 Niveaux (Si dépense &ge; Seuil)</option>
                                    </select>

                                    {workflowSettings.validation_depenses_mode !== 'simple' && (
                                      <div className="flex items-center justify-between gap-2 p-2 bg-amber-50/80 border border-amber-200 rounded-xl text-xs">
                                        <span className="text-[11px] font-bold text-amber-900 shrink-0">N2 requis si &ge; :</span>
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="number"
                                            step="10"
                                            value={workflowSettings.validation_depenses_seuil_n2 ?? 0}
                                            onChange={(e) => setWorkflowSettings({ ...workflowSettings, validation_depenses_seuil_n2: parseFloat(e.target.value) || 0 })}
                                            className="h-7 w-20 px-2 rounded-lg border border-amber-300 font-black text-xs text-amber-950 bg-white text-right"
                                          />
                                          <span className="text-[11px] font-bold text-amber-800">$</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>

                              {/* Module 1b : Paiement & Décaissement de Trésorerie */}
                              <tr className="hover:bg-amber-50/30 bg-amber-50/10 transition-colors border-b border-amber-100">
                                <td className="py-4 px-6">
                                  <span className="font-extrabold text-amber-950 text-sm block flex items-center gap-1.5">
                                    💳 Décaissement & Paiement Trésorerie
                                  </span>
                                  <span className="text-[11px] text-amber-800/80 font-medium">Exécution des virements & débits bancaires</span>
                                </td>
                                <td className="py-3 px-4">
                                  {renderRoleSelector(
                                    workflowSettings.roles_n1_paiement || ['tresorier'],
                                    (roles) => setWorkflowSettings({ ...workflowSettings, roles_n1_paiement: roles }),
                                    'bg-amber-100 text-amber-900 border-amber-300',
                                    !!workflowSettings.double_validation_n1_paiement,
                                    (checked) => setWorkflowSettings({ ...workflowSettings, double_validation_n1_paiement: checked })
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {renderRoleSelector(
                                    workflowSettings.roles_n2_paiement || ['president', 'vice_president'],
                                    (roles) => setWorkflowSettings({ ...workflowSettings, roles_n2_paiement: roles }),
                                    'bg-blue-50 text-blue-900 border-blue-200',
                                    !!workflowSettings.double_validation_n2_paiement,
                                    (checked) => setWorkflowSettings({ ...workflowSettings, double_validation_n2_paiement: checked })
                                  )}
                                </td>
                                <td className="py-4 px-6">
                                  <div className="space-y-2">
                                    <select
                                      value={workflowSettings.validation_paiement_mode === 'simple' ? 1 : 2}
                                      onChange={(e) => {
                                        const is2Levels = parseInt(e.target.value) === 2;
                                        setWorkflowSettings({ 
                                          ...workflowSettings, 
                                          validation_paiement_mode: is2Levels ? 'seuil' : 'simple' 
                                        });
                                      }}
                                      className="h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-900 shadow-sm w-full"
                                    >
                                      <option value={1}>1 Niveau (Paiement simple)</option>
                                      <option value={2}>2 Niveaux (Si dépense &ge; Seuil)</option>
                                    </select>

                                    {workflowSettings.validation_paiement_mode !== 'simple' && (
                                      <div className="flex items-center justify-between gap-2 p-2 bg-amber-100/80 border border-amber-300 rounded-xl text-xs">
                                        <span className="text-[11px] font-bold text-amber-950 shrink-0">Co-paiement N2 si &ge; :</span>
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="number"
                                            step="100"
                                            value={workflowSettings.validation_paiement_seuil_n2 ?? 500}
                                            onChange={(e) => setWorkflowSettings({ ...workflowSettings, validation_paiement_seuil_n2: parseFloat(e.target.value) || 0 })}
                                            className="h-7 w-20 px-2 rounded-lg border border-amber-400 font-black text-xs text-amber-950 bg-white text-right"
                                          />
                                          <span className="text-[11px] font-bold text-amber-900">$</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>

                              {/* Module 2 : Événements */}
                              <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-6">
                                  <span className="font-extrabold text-slate-900 text-sm block">Événements & Activités</span>
                                  <span className="text-[11px] text-slate-500">Publication au calendrier des membres</span>
                                </td>
                                <td className="py-3 px-4">
                                  {renderRoleSelector(
                                    workflowSettings.roles_n1_evenements || ['secretaire', 'vice_president', 'responsable_commission'],
                                    (roles) => setWorkflowSettings({ ...workflowSettings, roles_n1_evenements: roles }),
                                    'bg-slate-100 text-slate-800 border-slate-200',
                                    !!workflowSettings.double_validation_n1_evenements,
                                    (checked) => setWorkflowSettings({ ...workflowSettings, double_validation_n1_evenements: checked })
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {renderRoleSelector(
                                    workflowSettings.roles_n2_evenements || ['president', 'vice_president'],
                                    (roles) => setWorkflowSettings({ ...workflowSettings, roles_n2_evenements: roles }),
                                    'bg-blue-50 text-blue-900 border-blue-200',
                                    !!workflowSettings.double_validation_n2_evenements,
                                    (checked) => setWorkflowSettings({ ...workflowSettings, double_validation_n2_evenements: checked })
                                  )}
                                </td>
                                <td className="py-4 px-6">
                                  <select
                                    value={workflowSettings.validation_evenements_niveau}
                                    onChange={(e) => setWorkflowSettings({ ...workflowSettings, validation_evenements_niveau: parseInt(e.target.value) as 1 | 2 })}
                                    className="h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-900 shadow-sm"
                                  >
                                    <option value={1}>1 Niveau</option>
                                    <option value={2}>2 Niveaux</option>
                                  </select>
                                </td>
                              </tr>

                              {/* Module 3 : Articles */}
                              <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-6">
                                  <span className="font-extrabold text-slate-900 text-sm block">Articles & Communications</span>
                                  <span className="text-[11px] text-slate-500">Actualités et publications officielles</span>
                                </td>
                                <td className="py-3 px-4">
                                  {renderRoleSelector(
                                    workflowSettings.roles_n1_articles || ['responsable_com', 'vice_president'],
                                    (roles) => setWorkflowSettings({ ...workflowSettings, roles_n1_articles: roles }),
                                    'bg-slate-100 text-slate-800 border-slate-200',
                                    !!workflowSettings.double_validation_n1_articles,
                                    (checked) => setWorkflowSettings({ ...workflowSettings, double_validation_n1_articles: checked })
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {renderRoleSelector(
                                    workflowSettings.roles_n2_articles || ['president', 'vice_president'],
                                    (roles) => setWorkflowSettings({ ...workflowSettings, roles_n2_articles: roles }),
                                    'bg-blue-50 text-blue-900 border-blue-200',
                                    !!workflowSettings.double_validation_n2_articles,
                                    (checked) => setWorkflowSettings({ ...workflowSettings, double_validation_n2_articles: checked })
                                  )}
                                </td>
                                <td className="py-4 px-6">
                                  <select
                                    value={workflowSettings.validation_articles_niveau}
                                    onChange={(e) => setWorkflowSettings({ ...workflowSettings, validation_articles_niveau: parseInt(e.target.value) as 1 | 2 })}
                                    className="h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-900 shadow-sm"
                                  >
                                    <option value={1}>1 Niveau</option>
                                    <option value={2}>2 Niveaux</option>
                                  </select>
                                </td>
                              </tr>

                              {/* Module 4 : Votes */}
                              <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-6">
                                  <span className="font-extrabold text-slate-900 text-sm block">Scrutins & Résolutions de Vote</span>
                                  <span className="text-[11px] text-slate-500">Ouverture des votes électroniques</span>
                                </td>
                                <td className="py-3 px-4">
                                  {renderRoleSelector(
                                    workflowSettings.roles_n1_votes || ['secretaire', 'vice_president'],
                                    (roles) => setWorkflowSettings({ ...workflowSettings, roles_n1_votes: roles }),
                                    'bg-amber-50 text-amber-900 border-amber-200',
                                    !!workflowSettings.double_validation_n1_votes,
                                    (checked) => setWorkflowSettings({ ...workflowSettings, double_validation_n1_votes: checked })
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {renderRoleSelector(
                                    workflowSettings.roles_n2_votes || ['president', 'vice_president'],
                                    (roles) => setWorkflowSettings({ ...workflowSettings, roles_n2_votes: roles }),
                                    'bg-blue-50 text-blue-900 border-blue-200',
                                    !!workflowSettings.double_validation_n2_votes,
                                    (checked) => setWorkflowSettings({ ...workflowSettings, double_validation_n2_votes: checked })
                                  )}
                                </td>
                                <td className="py-4 px-6">
                                  <select
                                    value={workflowSettings.validation_votes_niveau}
                                    onChange={(e) => setWorkflowSettings({ ...workflowSettings, validation_votes_niveau: parseInt(e.target.value) as 1 | 2 })}
                                    className="h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-900 shadow-sm"
                                  >
                                    <option value={1}>1 Niveau</option>
                                    <option value={2}>2 Niveaux</option>
                                  </select>
                                </td>
                              </tr>

                              {/* Module 5 : Partenaires */}
                              <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-6">
                                  <span className="font-extrabold text-slate-900 text-sm block">Partenaires & Ententes</span>
                                  <span className="text-[11px] text-slate-500">Activer une entente partenaire</span>
                                </td>
                                <td className="py-3 px-4">
                                  {renderRoleSelector(
                                    workflowSettings.roles_n1_partenaires || ['responsable_partenariats', 'vice_president'],
                                    (roles) => setWorkflowSettings({ ...workflowSettings, roles_n1_partenaires: roles }),
                                    'bg-slate-100 text-slate-800 border-slate-200',
                                    !!workflowSettings.double_validation_n1_partenaires,
                                    (checked) => setWorkflowSettings({ ...workflowSettings, double_validation_n1_partenaires: checked })
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {renderRoleSelector(
                                    workflowSettings.roles_n2_partenaires || ['president', 'vice_president'],
                                    (roles) => setWorkflowSettings({ ...workflowSettings, roles_n2_partenaires: roles }),
                                    'bg-blue-50 text-blue-900 border-blue-200',
                                    !!workflowSettings.double_validation_n2_partenaires,
                                    (checked) => setWorkflowSettings({ ...workflowSettings, double_validation_n2_partenaires: checked })
                                  )}
                                </td>
                                <td className="py-4 px-6">
                                  <select
                                    value={workflowSettings.validation_partenaires_niveau}
                                    onChange={(e) => setWorkflowSettings({ ...workflowSettings, validation_partenaires_niveau: parseInt(e.target.value) as 1 | 2 })}
                                    className="h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-900 shadow-sm"
                                  >
                                    <option value={1}>1 Niveau</option>
                                    <option value={2}>2 Niveaux</option>
                                  </select>
                                </td>
                              </tr>
                            </>
                          );
                        })()}

                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* 3. NOTIFICATIONS AUTOMATIQUES */}
              <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-500" /> Notifications de Publication & Décisions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center space-x-3 p-4 border rounded-2xl bg-slate-50/50">
                    <Checkbox
                      id="notifyApp"
                      checked={workflowSettings.notify_app_on_approval !== false}
                      onCheckedChange={(checked) => setWorkflowSettings({ ...workflowSettings, notify_app_on_approval: checked === true })}
                      className="w-5 h-5"
                    />
                    <div>
                      <Label htmlFor="notifyApp" className="cursor-pointer font-bold text-xs text-slate-900 block">Notifications Cloche en Direct (In-App)</Label>
                      <span className="text-[10px] text-slate-500">Envoyer une alerte dans l&apos;espace membre lors de la validation ou révision.</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-2xl bg-slate-50/50">
                    <Checkbox
                      id="notifyEmail"
                      checked={workflowSettings.notify_email_on_approval !== false}
                      onCheckedChange={(checked) => setWorkflowSettings({ ...workflowSettings, notify_email_on_approval: checked === true })}
                      className="w-5 h-5"
                    />
                    <div>
                      <Label htmlFor="notifyEmail" className="cursor-pointer font-bold text-xs text-slate-900 block">Notifications par Courriel (Email SMTP)</Label>
                      <span className="text-[10px] text-slate-500">Envoyer automatiquement un courriel d&apos;alerte aux membres destinataires.</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* BARRE DE SAUVEGARDE EN BAS */}
              <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-3xl shadow-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-300">
                    N&apos;oubliez pas d&apos;enregistrer vos modifications une fois la configuration terminée.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {workflowSaveStatus === 'saving' && (
                    <span className="text-xs text-amber-300 font-bold animate-pulse">Enregistrement...</span>
                  )}
                  {workflowSaveStatus === 'saved' && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Modifications enregistrées !
                    </span>
                  )}
                  {workflowSaveStatus === 'error' && (
                    <span className="text-xs text-red-400 font-bold">Erreur de sauvegarde</span>
                  )}
                  <Button
                    onClick={() => handleSaveWorkflows()}
                    disabled={savingWorkflows}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs h-10 rounded-xl px-6 shadow-md"
                  >
                    {savingWorkflows ? 'Sauvegarde...' : 'Enregistrer la Gouvernance'}
                  </Button>
                </div>
              </div>

            </div>
          )}

          {/* CONTENU : ONGLET FINANCES & COTISATIONS */}
          {activeTab === 'finances' && (isPresident || isTres) && (
            <div className="space-y-8 w-full">
              {/* 1. Tarif Cotisation Annuelle */}
              <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" /> Tarif de la Cotisation Annuelle des Membres
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">Définissez le tarif de la cotisation d&apos;adhésion annuelle au réseau.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="max-w-xs space-y-1.5">
                    <Label htmlFor="cotisation" className="font-bold text-xs uppercase tracking-wider text-slate-700">Montant de la cotisation ($ CAD)</Label>
                    <Input
                      id="cotisation"
                      type="number"
                      step="5"
                      value={cotisationMontant}
                      onChange={(e) => setCotisationMontant(parseFloat(e.target.value))}
                      className="h-11 rounded-xl border-slate-200 font-extrabold text-blue-950"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 1b. Catégories de Paiement & Recettes */}
              <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
                <div className="h-1.5 bg-emerald-600" />
                <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-emerald-600" /> Catégories de Recettes & Paiements
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Gérez les catégories de paiements statutaires (cotisations, subventions, partenariats...) et ajoutez-en de nouvelles.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-3">
                    <Label className="font-bold text-xs uppercase tracking-wider text-slate-700 block">
                      Catégories Actives ({paymentCategories.length})
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {paymentCategories.map((cat, idx) => (
                        <div key={cat.key} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-xs text-slate-900 block">{cat.label}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">Key: {cat.key}</span>
                          </div>
                          {idx >= 5 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                const updated = paymentCategories.filter(c => c.key !== cat.key);
                                setPaymentCategories(updated);
                                await savePaymentCategories(updated);
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0 rounded-lg shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <Label className="font-extrabold text-xs uppercase tracking-wider text-slate-800 block">
                      Créer une nouvelle catégorie de recette
                    </Label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <Input
                        placeholder="Ex: Vente de Goodies / Matériel"
                        value={newCategoryLabel}
                        onChange={(e) => setNewCategoryLabel(e.target.value)}
                        className="h-11 rounded-xl border-slate-200 text-xs font-medium flex-1"
                      />
                      <Button
                        type="button"
                        onClick={async () => {
                          if (!newCategoryLabel.trim()) return;
                          const key = newCategoryLabel.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '_');
                          if (paymentCategories.some(c => c.key === key)) {
                            alert("Une catégorie avec ce nom ou cette clé existe déjà.");
                            return;
                          }
                          const updated = [...paymentCategories, { key, label: newCategoryLabel.trim() }];
                          setPaymentCategories(updated);
                          setNewCategoryLabel('');
                          const res = await savePaymentCategories(updated);
                          if (res.success) {
                            alert("Nouvelle catégorie de paiement enregistrée !");
                          } else {
                            alert(res.error || "Erreur lors de l'enregistrement.");
                          }
                        }}
                        disabled={!newCategoryLabel.trim()}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-11 rounded-xl px-5 gap-2 shrink-0"
                      >
                        <Plus className="w-4 h-4" /> Ajouter la catégorie
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 1c. Comptes de Trésorerie Débiteurs / Créditeurs (Enrichi & Standardisé) */}
              <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
                <div className="h-1.5 bg-blue-900" />
                <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Vault className="w-5 h-5 text-blue-900" /> Comptes de Trésorerie & Caisses
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Gérez les comptes bancaires, passerelles et caisses (institution, transit, solde initial, compte par défaut) imputés lors des recettes et débits.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditingAccount(null);
                      setAccountForm({
                        nom: '',
                        type: 'banque',
                        institution: '',
                        numero_compte: '',
                        transit_routing: '',
                        solde_initial: 0,
                        devise: 'CAD',
                        description: '',
                        est_defaut: false,
                        actif: true,
                      });
                      setShowAccountModal(true);
                    }}
                    className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-xs h-10 rounded-xl px-4 gap-2 shrink-0 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Nouveau Compte de Trésorerie
                  </Button>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {treasuryAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                          acc.est_defaut
                            ? 'bg-blue-50/40 border-blue-900/40 shadow-sm'
                            : 'bg-slate-50/70 border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm text-slate-900">{acc.nom}</span>
                              {acc.est_defaut && (
                                <span className="text-[10px] bg-blue-900 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  ★ Compte par Défaut
                                </span>
                              )}
                              {!acc.actif && (
                                <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full uppercase">
                                  Inactif
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200 uppercase shrink-0">
                              {acc.type}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-slate-600">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block uppercase">Institution</span>
                              <span className="font-bold text-slate-800">{acc.institution || '—'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block uppercase">N° de Compte</span>
                              <span className="font-mono font-semibold text-slate-800">{acc.numero_compte ? `•••• ${acc.numero_compte.slice(-4)}` : '—'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block uppercase">Transit / Swift</span>
                              <span className="font-mono text-slate-700">{acc.transit_routing || '—'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block uppercase">Solde Initial</span>
                              <span className="font-bold text-emerald-700">{(acc.solde_initial ?? acc.solde ?? 0).toLocaleString('fr-CA', { style: 'currency', currency: acc.devise || 'CAD' })}</span>
                            </div>
                          </div>

                          {acc.description && (
                            <p className="text-xs text-slate-500 pt-1 line-clamp-2 italic">{acc.description}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 gap-2">
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingAccount(acc);
                                setAccountForm({
                                  nom: acc.nom,
                                  type: acc.type,
                                  institution: acc.institution || '',
                                  numero_compte: acc.numero_compte || '',
                                  transit_routing: acc.transit_routing || '',
                                  solde_initial: acc.solde_initial ?? acc.solde ?? 0,
                                  devise: acc.devise || 'CAD',
                                  description: acc.description || '',
                                  est_defaut: !!acc.est_defaut,
                                  actif: acc.actif !== false,
                                });
                                setShowAccountModal(true);
                              }}
                              className="h-8 text-xs font-bold rounded-lg border-slate-300 hover:bg-white gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Éditer
                            </Button>
                            {treasuryAccounts.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (confirm(`Voulez-vous vraiment supprimer le compte "${acc.nom}" ?`)) {
                                    const updated = treasuryAccounts.filter(a => a.id !== acc.id);
                                    setTreasuryAccounts(updated);
                                    const res = await saveTreasuryAccounts(updated);
                                    if (res.success) {
                                      alert("Compte de trésorerie supprimé.");
                                    } else {
                                      alert(res.error || "Erreur lors de la suppression.");
                                    }
                                  }
                                }}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>

                          {!acc.est_defaut && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                const updated = treasuryAccounts.map(a => ({
                                  ...a,
                                  est_defaut: a.id === acc.id,
                                }));
                                setTreasuryAccounts(updated);
                                await saveTreasuryAccounts(updated);
                              }}
                              className="h-8 text-[11px] text-blue-900 font-bold hover:bg-blue-50 rounded-lg"
                            >
                              Définir par défaut
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Modal de Création / Édition de Compte de Trésorerie */}
                  {showAccountModal && (
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 bg-blue-900 text-white flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Vault className="w-5 h-5 text-amber-400" />
                            <h3 className="font-extrabold text-base">
                              {editingAccount ? `Modifier le compte : ${editingAccount.nom}` : 'Ajouter un Compte de Trésorerie'}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowAccountModal(false)}
                            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!accountForm.nom?.trim()) return;

                            const targetId = editingAccount
                              ? editingAccount.id
                              : accountForm.nom.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '_');

                            let updatedList = [...treasuryAccounts];

                            if (accountForm.est_defaut) {
                              updatedList = updatedList.map(a => ({ ...a, est_defaut: false }));
                            }

                            const newOrUpdatedAccount: TreasuryAccount = {
                              id: targetId,
                              nom: accountForm.nom.trim(),
                              type: (accountForm.type as TreasuryAccount['type']) || 'banque',
                              institution: accountForm.institution || undefined,
                              numero_compte: accountForm.numero_compte || undefined,
                              transit_routing: accountForm.transit_routing || undefined,
                              solde_initial: accountForm.solde_initial || 0,
                              solde: accountForm.solde_initial || 0,
                              devise: accountForm.devise || 'CAD',
                              description: accountForm.description || undefined,
                              est_defaut: !!accountForm.est_defaut,
                              actif: accountForm.actif !== false,
                            };

                            if (editingAccount) {
                              updatedList = updatedList.map(a => a.id === editingAccount.id ? newOrUpdatedAccount : a);
                            } else {
                              if (updatedList.some(a => a.id === targetId)) {
                                alert("Un compte avec ce nom existe déjà.");
                                return;
                              }
                              updatedList.push(newOrUpdatedAccount);
                            }

                            setTreasuryAccounts(updatedList);
                            setShowAccountModal(false);
                            const res = await saveTreasuryAccounts(updatedList);
                            if (res.success) {
                              alert("Compte de trésorerie sauvegardé avec succès !");
                            } else {
                              alert(res.error || "Erreur lors de la sauvegarde.");
                            }
                          }}
                          className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1 sm:col-span-2">
                              <Label className="font-extrabold text-xs uppercase tracking-wider text-slate-700">Intitulé du Compte *</Label>
                              <Input
                                required
                                placeholder="Ex: Compte Courant Desjardins #1"
                                value={accountForm.nom || ''}
                                onChange={(e) => setAccountForm({ ...accountForm, nom: e.target.value })}
                                className="h-11 rounded-xl text-xs font-semibold border-slate-200"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="font-extrabold text-xs uppercase tracking-wider text-slate-700">Type de Compte</Label>
                              <select
                                value={accountForm.type || 'banque'}
                                onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value as TreasuryAccount['type'] })}
                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-blue-900"
                              >
                                <option value="banque">Compte Bancaire (Opérationnel)</option>
                                <option value="epargne">Compte d'Épargne / Réserve</option>
                                <option value="caisse">Petite Caisse / Espèces</option>
                                <option value="stripe">Passerelle Stripe / En Ligne</option>
                                <option value="paypal">Passerelle PayPal / Interac</option>
                                <option value="autre">Autre compte de liquidités</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <Label className="font-extrabold text-xs uppercase tracking-wider text-slate-700">Institution Financière</Label>
                              <Input
                                placeholder="Ex: Desjardins, Banque Nationale..."
                                value={accountForm.institution || ''}
                                onChange={(e) => setAccountForm({ ...accountForm, institution: e.target.value })}
                                className="h-11 rounded-xl text-xs border-slate-200"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="font-extrabold text-xs uppercase tracking-wider text-slate-700">Numéro de Compte / IBAN</Label>
                              <Input
                                placeholder="Ex: 815-12345-001"
                                value={accountForm.numero_compte || ''}
                                onChange={(e) => setAccountForm({ ...accountForm, numero_compte: e.target.value })}
                                className="h-11 rounded-xl text-xs font-mono border-slate-200"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="font-extrabold text-xs uppercase tracking-wider text-slate-700">Transit / Routing / Swift</Label>
                              <Input
                                placeholder="Ex: Transit 00452"
                                value={accountForm.transit_routing || ''}
                                onChange={(e) => setAccountForm({ ...accountForm, transit_routing: e.target.value })}
                                className="h-11 rounded-xl text-xs font-mono border-slate-200"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="font-extrabold text-xs uppercase tracking-wider text-slate-700">Solde Initial ($ CAD)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={accountForm.solde_initial ?? 0}
                                onChange={(e) => setAccountForm({ ...accountForm, solde_initial: parseFloat(e.target.value) || 0 })}
                                className="h-11 rounded-xl text-xs font-bold border-slate-200 text-emerald-700"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="font-extrabold text-xs uppercase tracking-wider text-slate-700">Devise</Label>
                              <Input
                                value={accountForm.devise || 'CAD'}
                                onChange={(e) => setAccountForm({ ...accountForm, devise: e.target.value.toUpperCase() })}
                                className="h-11 rounded-xl text-xs font-bold uppercase border-slate-200"
                              />
                            </div>

                            <div className="space-y-1 sm:col-span-2">
                              <Label className="font-extrabold text-xs uppercase tracking-wider text-slate-700">Description / Usage</Label>
                              <Textarea
                                rows={2}
                                placeholder="Précisez l'utilisation principale de ce compte..."
                                value={accountForm.description || ''}
                                onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value })}
                                className="rounded-xl text-xs border-slate-200"
                              />
                            </div>
                          </div>

                          <div className="pt-2 space-y-2">
                            <div className="flex items-center space-x-2.5">
                              <Checkbox
                                id="estDefaut"
                                checked={!!accountForm.est_defaut}
                                onCheckedChange={(chk) => setAccountForm({ ...accountForm, est_defaut: chk === true })}
                              />
                              <Label htmlFor="estDefaut" className="text-xs font-bold text-slate-800 cursor-pointer">
                                Définir comme compte principal par défaut (crédité / débité par défaut)
                              </Label>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowAccountModal(false)}
                              className="h-11 rounded-xl text-xs font-bold px-5"
                            >
                              Annuler
                            </Button>
                            <Button
                              type="submit"
                              className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold h-11 rounded-xl px-6 text-xs shadow-md"
                            >
                              Enregistrer le Compte
                            </Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 2. Délais de Grâce */}
              <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
                <div className="h-1.5 bg-blue-900" />
                <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" /> Délais de Grâce & Durée de Validité de la Cotisation
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Définissez les délais en jours accordés aux membres pour cotiser après approbation et lors du renouvellement annuel.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5 p-4 border rounded-2xl bg-amber-50/30 border-amber-200">
                      <Label htmlFor="delaiAdhesion" className="font-bold text-xs uppercase tracking-wider text-slate-800 block">
                        Délai de grâce à l&apos;approbation (jours) *
                      </Label>
                      <Input
                        id="delaiAdhesion"
                        type="number"
                        min="1"
                        max="180"
                        value={delaiGraceAdhesion}
                        onChange={(e) => setDelaiGraceAdhesion(parseInt(e.target.value) || 14)}
                        className="h-11 rounded-xl border-slate-200 font-extrabold text-blue-950"
                      />
                      <p className="text-[11px] text-amber-900">
                        Nombre de jours accordés après l&apos;approbation de la candidature par le CA pour régler la 1ère cotisation avant le blocage de l&apos;accès.
                      </p>
                    </div>

                    <div className="space-y-1.5 p-4 border rounded-2xl bg-amber-50/30 border-amber-200">
                      <Label htmlFor="delaiRenouvellement" className="font-bold text-xs uppercase tracking-wider text-slate-800 block">
                        Délai de grâce au renouvellement annuel (jours) *
                      </Label>
                      <Input
                        id="delaiRenouvellement"
                        type="number"
                        min="1"
                        max="180"
                        value={delaiGraceRenouvellement}
                        onChange={(e) => setDelaiGraceRenouvellement(parseInt(e.target.value) || 14)}
                        className="h-11 rounded-xl border-slate-200 font-extrabold text-blue-950"
                      />
                      <p className="text-[11px] text-amber-900">
                        Nombre de jours accordés après l&apos;échéance de validité (1 an) pour effectuer le ré-abonnement annuel avant invalidation de la carte.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border rounded-2xl text-xs text-slate-700 space-y-1.5">
                    <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      📌 Durée de validité de la cotisation :
                    </span>
                    <p className="leading-relaxed">
                      La cotisation est valide pour une durée exacte de <strong>365 jours (1 an fixe)</strong> à compter de la date de paiement ou d&apos;adhésion. Les rappels et délais de grâce s&apos;appliquent automatiquement dès le franchissement de cette échéance.
                    </p>
                  </div>

                  <Button
                    onClick={async () => {
                      const res = await updateAdhesionGraceSettings({
                        delai_grace_adhesion_jours: delaiGraceAdhesion,
                        delai_grace_renouvellement_jours: delaiGraceRenouvellement,
                      });
                      if (res.success) {
                        alert("Délais de grâce et de renouvellement mis à jour avec succès !");
                      } else {
                        alert(res.error || "Erreur lors de la sauvegarde.");
                      }
                    }}
                    className="bg-blue-900 hover:bg-blue-950 text-white font-bold h-11 rounded-xl px-6"
                  >
                    Enregistrer les délais de grâce
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-base font-extrabold text-slate-900">Fonds de Solidarité & Entraide</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Paramétrez le plafond d&apos;aide financière d&apos;urgence.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="max-w-xs space-y-1.5">
                    <Label htmlFor="seuilFonds" className="font-bold text-xs uppercase tracking-wider text-slate-700">Plafond d&apos;aide maximale par dossier ($ CAD)</Label>
                    <Input
                      id="seuilFonds"
                      type="number"
                      step="50"
                      value={fondsSeuilMax}
                      onChange={(e) => setFondsSeuilMax(parseFloat(e.target.value))}
                      className="h-11 rounded-xl border-slate-200 font-bold"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 border rounded-2xl text-xs text-slate-600 space-y-1">
                    <p className="font-bold text-slate-900">⚠️ Règle d&apos;admissibilité statutaire :</p>
                    <p>Les candidats doivent être membres actifs et approuvés pour pouvoir déposer une demande de fonds d&apos;urgence.</p>
                  </div>

                  <Button onClick={handleSaveFinanceSettings} className="bg-blue-900 hover:bg-blue-950 text-white font-bold h-11 rounded-xl px-6">
                    Enregistrer les paramètres financiers
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
