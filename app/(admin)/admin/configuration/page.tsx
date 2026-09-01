'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Users, DollarSign, AlertTriangle, Plus, Trash2, CheckCircle2, Sliders, Bell, Mail, GitBranch, Clock } from 'lucide-react';
import { getWorkflowSettings, updateWorkflowSettings, WorkflowSettings } from '@/app/actions/validation';
import { getAdhesionGraceSettings, updateAdhesionGraceSettings } from '@/app/actions/adhesion';
import { ensureSystemCommissionsExist } from '@/app/actions/commissions-workspace';

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

  // Workflow Settings State
  const [workflowSettings, setWorkflowSettings] = useState<WorkflowSettings>({
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
        objectifs: selectedComm.objectifs
      })
      .eq('id', selectedComm.id);

    if (!error) {
      alert("Paramètres de la commission enregistrés !");
      setSelectedComm(null);
      fetchData();
    } else {
      console.error(error);
      alert("Erreur lors de l'enregistrement.");
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

  const handleSaveWorkflows = async () => {
    const res = await updateWorkflowSettings(workflowSettings);
    if (res.success) {
      alert("Paramètres des flux de validation enregistrés avec succès !");
      fetchData();
    } else {
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
      <div>
        <h1 className="text-3xl font-extrabold text-blue-950">Configuration de l&apos;Association</h1>
        <p className="text-sm text-slate-500">Gérez les structures de gouvernance, l&apos;affectation du bureau, les workflows et les finances.</p>
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
                      onClick={() => setSelectedComm(c)}
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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
                      </div>

                      <Button type="submit" className="bg-blue-900 hover:bg-blue-950 text-white font-bold h-11 rounded-xl px-6 mt-4">
                        Enregistrer la commission
                      </Button>
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
              {/* 1. Validation Financière (Dépenses) */}
              <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
                <div className="h-1.5 bg-amber-500" />
                <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" /> Validation des Dépenses & Remboursements
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Configurez si la double validation (Trésorier + Président) est systématique ou déclenchée au-delà d&apos;un montant.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-3">
                    <Label className="font-bold text-xs uppercase tracking-wider text-slate-700 block">Mode d&apos;Approbation Financière</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div
                        onClick={() => setWorkflowSettings({ ...workflowSettings, validation_depenses_mode: 'double' })}
                        className={`p-4 border rounded-2xl cursor-pointer transition-all ${
                          workflowSettings.validation_depenses_mode === 'double'
                            ? 'bg-blue-50/80 border-blue-900 ring-2 ring-blue-900/20'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-extrabold text-slate-900 text-sm block">Double Validation Obligatoire</span>
                        <span className="text-xs text-slate-500">Trésorier (N1) + Présidence (N2) pour TOUTE dépense.</span>
                      </div>

                      <div
                        onClick={() => setWorkflowSettings({ ...workflowSettings, validation_depenses_mode: 'seuil' })}
                        className={`p-4 border rounded-2xl cursor-pointer transition-all ${
                          workflowSettings.validation_depenses_mode === 'seuil'
                            ? 'bg-blue-50/80 border-blue-900 ring-2 ring-blue-900/20'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-extrabold text-slate-900 text-sm block">Déclenchement par Seuil ($)</span>
                        <span className="text-xs text-slate-500">1 niveau sous le seuil, 2 niveaux au-dessus du seuil.</span>
                      </div>

                      <div
                        onClick={() => setWorkflowSettings({ ...workflowSettings, validation_depenses_mode: 'simple' })}
                        className={`p-4 border rounded-2xl cursor-pointer transition-all ${
                          workflowSettings.validation_depenses_mode === 'simple'
                            ? 'bg-blue-50/80 border-blue-900 ring-2 ring-blue-900/20'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-extrabold text-slate-900 text-sm block">Validation Simple (Trésorier)</span>
                        <span className="text-xs text-slate-500">Le Trésorier valide seul la conformité budgétaire.</span>
                      </div>
                    </div>
                  </div>

                  {workflowSettings.validation_depenses_mode === 'seuil' && (
                    <div className="max-w-xs space-y-1.5 p-4 border rounded-2xl bg-amber-50/30">
                      <Label htmlFor="seuilN2" className="font-bold text-xs uppercase tracking-wider text-slate-700">Seuil de double validation ($ CAD)</Label>
                      <Input
                        id="seuilN2"
                        type="number"
                        step="25"
                        value={workflowSettings.validation_depenses_seuil_n2}
                        onChange={(e) => setWorkflowSettings({ ...workflowSettings, validation_depenses_seuil_n2: parseFloat(e.target.value) || 0 })}
                        className="h-11 rounded-xl border-slate-200 font-extrabold"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 2. Niveaux par Type d'Entité */}
              <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-blue-900" /> Circuits d&apos;Approbation par Module
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Définissez s&apos;il faut 1 ou 2 niveaux d&apos;approbation avant publication officielle.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Événements */}
                    <div className="space-y-2 p-5 border rounded-2xl bg-slate-50/40">
                      <Label className="font-extrabold text-xs uppercase tracking-wider text-slate-800 block">Événements & Activités</Label>
                      <select
                        value={workflowSettings.validation_evenements_niveau}
                        onChange={(e) => setWorkflowSettings({ ...workflowSettings, validation_evenements_niveau: parseInt(e.target.value) as 1 | 2 })}
                        className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-blue-900"
                      >
                        <option value={1}>1 Niveau (Secrétariat / Présidence)</option>
                        <option value={2}>2 Niveaux (Commission/Org + Présidence)</option>
                      </select>
                    </div>

                    {/* Articles */}
                    <div className="space-y-2 p-5 border rounded-2xl bg-slate-50/40">
                      <Label className="font-extrabold text-xs uppercase tracking-wider text-slate-800 block">Articles & Communications</Label>
                      <select
                        value={workflowSettings.validation_articles_niveau}
                        onChange={(e) => setWorkflowSettings({ ...workflowSettings, validation_articles_niveau: parseInt(e.target.value) as 1 | 2 })}
                        className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-blue-900"
                      >
                        <option value={1}>1 Niveau (Responsable Comm / Présidence)</option>
                        <option value={2}>2 Niveaux (Relecture Comm + Présidence)</option>
                      </select>
                    </div>

                    {/* Votes */}
                    <div className="space-y-2 p-5 border rounded-2xl bg-slate-50/40">
                      <Label className="font-extrabold text-xs uppercase tracking-wider text-slate-800 block">Scrutins & Résolutions de Vote</Label>
                      <select
                        value={workflowSettings.validation_votes_niveau}
                        onChange={(e) => setWorkflowSettings({ ...workflowSettings, validation_votes_niveau: parseInt(e.target.value) as 1 | 2 })}
                        className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-blue-900"
                      >
                        <option value={1}>1 Niveau (Secrétaire Général)</option>
                        <option value={2}>2 Niveaux (Secrétaire + Présidence)</option>
                      </select>
                    </div>

                    {/* Partenaires */}
                    <div className="space-y-2 p-5 border rounded-2xl bg-slate-50/40">
                      <Label className="font-extrabold text-xs uppercase tracking-wider text-slate-800 block">Partenaires & Organisations</Label>
                      <select
                        value={workflowSettings.validation_partenaires_niveau}
                        onChange={(e) => setWorkflowSettings({ ...workflowSettings, validation_partenaires_niveau: parseInt(e.target.value) as 1 | 2 })}
                        className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-blue-900"
                      >
                        <option value={1}>1 Niveau (Responsable Partenariats)</option>
                        <option value={2}>2 Niveaux (Partenariats + Présidence)</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Notifications */}
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
                      checked={workflowSettings.notify_app_on_approval}
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
                      checked={workflowSettings.notify_email_on_approval}
                      onCheckedChange={(checked) => setWorkflowSettings({ ...workflowSettings, notify_email_on_approval: checked === true })}
                      className="w-5 h-5"
                    />
                    <div>
                      <Label htmlFor="notifyEmail" className="cursor-pointer font-bold text-xs text-slate-900 block">Notifications par Courriel (Email SMTP)</Label>
                      <span className="text-[10px] text-slate-500">Envoyer automatiquement un courriel d&apos;alerte aux membres destinataires.</span>
                    </div>
                  </div>

                  <Button onClick={handleSaveWorkflows} className="bg-blue-900 hover:bg-blue-950 text-white font-bold h-11 rounded-xl px-6 mt-4">
                    Enregistrer les paramètres des flux
                  </Button>
                </CardContent>
              </Card>
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
