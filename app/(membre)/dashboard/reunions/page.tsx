'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Video,
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  ChevronRight,
  Sparkles,
  Building2,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';
import { getReunionsList, createReunion, updateMemberRSVP } from '@/app/actions/reunions';

export default function MemberReunionsPage() {
  const supabase = createClient();
  const [reunions, setReunions] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filterType, setFilterType] = useState<string>('tous');
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [onlyMine, setOnlyMine] = useState<boolean>(false);

  // Modal Create State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    titre: '',
    type_reunion: 'bureau',
    format_reunion: 'presentiel',
    lieu: '',
    lien_visio: '',
    date_debut: '',
    date_fin: '',
    description: '',
    commission_id: '',
    convoques_ids: [] as string[],
    odj_text: '',
  });

  useEffect(() => {
    initData();
  }, [filterType, filterStatut, onlyMine]);

  const initData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: prof } = await supabase
        .from('profiles')
        .select('*, commission_membres(*)')
        .eq('id', user.id)
        .single();
      setCurrentUserProfile(prof);
    }

    const list = await getReunionsList({
      type_reunion: filterType,
      statut: filterStatut,
      mes_convocations_uniquement: onlyMine,
    });
    setReunions(list);

    // Fetch commissions for selection
    const { data: comms } = await supabase.from('commissions').select('id, nom').eq('statut', 'active');
    setCommissions(comms || []);

    // Fetch members for invitations
    const { data: mems } = await supabase.from('profiles').select('id, prenom, nom, role, email').order('prenom');
    setMembers(mems || []);

    setLoading(false);
  };

  const isBureauUser = currentUserProfile && ['admin_ca', 'tresorier', 'superadmin'].includes(currentUserProfile.role);
  const myManagedComms = new Set(
    (currentUserProfile?.commission_membres || [])
      .filter((cm: any) => ['president', 'responsable', 'vice_president'].includes((cm.role_commission || '').toLowerCase()))
      .map((cm: any) => cm.commission_id)
  );
  const isCommLeaderUser = myManagedComms.size > 0;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titre || !formData.date_debut) {
      alert('Veuillez renseigner au moins le titre et la date de début.');
      return;
    }
    setIsSubmitting(true);

    // Parse ODJ lines if provided
    const odjItems = formData.odj_text
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => ({ titre: line.trim(), duree_minutes: 15 }));

    const res = await createReunion({
      titre: formData.titre,
      type_reunion: formData.type_reunion,
      format_reunion: formData.format_reunion,
      lieu: formData.lieu,
      lien_visio: formData.lien_visio,
      date_debut: formData.date_debut,
      date_fin: formData.date_fin || undefined,
      description: formData.description,
      commission_id: formData.commission_id || undefined,
      convoques_ids: formData.convoques_ids,
      odj_items: odjItems,
    });

    setIsSubmitting(false);

    if (res.success) {
      alert('Réunion de travail convoquée et créée avec succès !');
      setIsCreateOpen(false);
      setFormData({
        titre: '',
        type_reunion: 'bureau',
        format_reunion: 'presentiel',
        lieu: '',
        lien_visio: '',
        date_debut: '',
        date_fin: '',
        description: '',
        commission_id: '',
        bureau_complet: true,
        convoques_ids: [],
        odj_text: '',
      });
      initData();
    } else {
      alert(res.error || 'Erreur lors de la création de la réunion.');
    }
  };

  const handleRSVP = async (reunionId: string, statut: 'present' | 'excuse' | 'absent') => {
    let motif = '';
    if (statut === 'excuse') {
      motif = prompt('Précisez le motif de votre absence excusée (optionnel) :') || '';
    }

    const res = await updateMemberRSVP({ reunionId, statut, motifAbsence: motif });
    if (res.success) {
      initData();
    } else {
      alert(res.error || 'Erreur lors de la mise à jour de votre statut.');
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'bureau':
        return <span className="bg-indigo-100 text-indigo-900 border border-indigo-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase">👑 Bureau Exécutif</span>;
      case 'reunion_ca':
        return <span className="bg-blue-100 text-blue-900 border border-blue-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase">🏛️ Réunion du CA</span>;
      case 'inter_commissions':
        return <span className="bg-purple-100 text-purple-900 border border-purple-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase">🤝 Inter-Commissions</span>;
      case 'president_commissions':
        return <span className="bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase">⭐ Président & Commissions</span>;
      case 'commission':
        return <span className="bg-slate-100 text-slate-800 border border-slate-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase">👥 Séance de Commission</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase">💼 Réunion Extraordinaire</span>;
    }
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'convoquee':
        return <span className="bg-blue-50 text-blue-950 border border-blue-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">📅 Convoquée</span>;
      case 'en_cours':
        return <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full animate-pulse">⚡ Séance en cours</span>;
      case 'terminee':
        return <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">✓ Clôturée & PV</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">Annulée</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-500 absolute top-0 left-0 right-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 text-blue-950 rounded-2xl">
                <Video className="w-6 h-6 text-blue-950" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Réunions & Gouvernance</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Espace officiel de convocation des réunions du Bureau, consultations inter-commissions, ordres du jour et compte-rendus (PV).
            </p>
          </div>

          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-blue-950 hover:bg-blue-900 text-white font-extrabold h-11 px-5 rounded-2xl shadow-md gap-2 shrink-0 text-xs"
          >
            <Plus className="w-4 h-4" /> Convoquer une Réunion
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="border border-slate-200/80 shadow-sm rounded-2xl bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <Filter className="w-4 h-4 text-blue-950" /> Filtrer par type :
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-9 text-xs rounded-xl border-slate-200 font-medium bg-slate-50 px-3"
            >
              <option value="tous">Tous les types de réunions</option>
              <option value="bureau">Réunion du Bureau Exécutif</option>
              <option value="inter_commissions">Réunion Inter-Commissions</option>
              <option value="president_commissions">Président & Responsables</option>
              <option value="ca">Conseil d'Administration (CA)</option>
              <option value="ag">Assemblée Générale (AG)</option>
              <option value="commission">Séances de Commission</option>
            </select>

            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="h-9 text-xs rounded-xl border-slate-200 font-medium bg-slate-50 px-3"
            >
              <option value="tous">Tous les statuts</option>
              <option value="convoquee">Convoquées à venir</option>
              <option value="en_cours">Séances en cours</option>
              <option value="terminee">Clôturées avec PV</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => setOnlyMine(e.target.checked)}
              className="rounded text-blue-950 focus:ring-blue-950"
            />
            Mes convocations uniquement
          </label>
        </div>
      </Card>

      {/* Reunions Grid / List */}
      {loading ? (
        <Card className="p-12 text-center text-slate-400 text-xs italic">Chargement des réunions de travail...</Card>
      ) : reunions.length === 0 ? (
        <Card className="p-12 text-center space-y-3 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
          <Video className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="font-extrabold text-slate-800 text-sm">Aucune réunion répertoriée avec ces filtres</h3>
          <p className="text-xs text-slate-400">Utilisez le bouton "Convoquer une Réunion" pour planifier la prochaine séance du Bureau ou des Commissions.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reunions.map((reunion) => {
            const myPresence = (reunion.presences || []).find((p: any) => p.profile_id === currentUserId);
            const presencesCount = (reunion.presences || []).filter((p: any) => p.statut === 'present').length;
            const totalConvoques = (reunion.presences || []).length;
            const startDate = new Date(reunion.date_debut);

            return (
              <Card key={reunion.id} className="border border-slate-200/80 shadow-md hover:shadow-lg transition-all rounded-3xl bg-white p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {getTypeBadge(reunion.type_reunion)}
                      {getStatutBadge(reunion.statut)}
                    </div>
                    {reunion.commission && (
                      <span className="text-[10px] font-bold text-blue-950 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                        {reunion.commission.nom}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg leading-snug">{reunion.titre}</h3>
                    {reunion.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 mt-1 font-medium leading-relaxed">{reunion.description}</p>
                    )}
                  </div>

                  {/* Dates & Format */}
                  <div className="space-y-2 text-xs font-semibold text-slate-600 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-950 shrink-0" />
                      <span>{startDate.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Heure : {startDate.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {reunion.format_reunion === 'presentiel' ? (
                      <div className="flex items-center gap-2 text-emerald-950 font-bold">
                        <MapPin className="w-4 h-4 text-emerald-800 shrink-0" />
                        <span>Présentiel : {reunion.lieu || 'Lieu communiqué aux convoqués'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-blue-950 font-bold">
                        <Video className="w-4 h-4 text-blue-950 shrink-0" />
                        <span>Visio : {reunion.lien_visio ? <a href={reunion.lien_visio} target="_blank" rel="noreferrer" className="underline hover:text-blue-900">Rejoindre la réunion visio</a> : 'Lien visio en cours'}</span>
                      </div>
                    )}
                  </div>

                  {/* Convocations & Presence Summary */}
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-1">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-slate-400" />
                      Émargement : <strong className="text-slate-900">{presencesCount} / {totalConvoques} Présents</strong>
                    </span>
                    {reunion.pv && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-900 border border-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <FileText className="w-3 h-3 text-emerald-900" /> PV Acté
                      </span>
                    )}
                  </div>

                  {/* Individual RSVP Status & Quick Change */}
                  {myPresence && (
                    <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200 flex items-center justify-between gap-3">
                      <div className="text-xs">
                        <span className="text-[10px] text-blue-950 font-extrabold uppercase block">Votre statut :</span>
                        <strong className="text-slate-900">
                          {myPresence.statut === 'present' ? '✓ Vous avez confirmé votre présence' : myPresence.statut === 'excuse' ? '✉️ Vous êtes excusé(e)' : '⏳ En attente de confirmation'}
                        </strong>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleRSVP(reunion.id, 'present')}
                          className={`h-7 text-[10px] font-bold rounded-xl ${
                            myPresence.statut === 'present' ? 'bg-emerald-700 text-white' : 'bg-white border text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          Présent(e)
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRSVP(reunion.id, 'excuse')}
                          className={`h-7 text-[10px] font-bold rounded-xl ${
                            myPresence.statut === 'excuse' ? 'bg-amber-700 text-white' : 'bg-white border text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          Excusé(e)
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-950 text-white text-[10px] font-bold flex items-center justify-center">
                      {reunion.organisateur?.prenom?.[0]}{reunion.organisateur?.nom?.[0]}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Convocation par {reunion.organisateur?.prenom} {reunion.organisateur?.nom}
                    </span>
                  </div>

                  <Link href={`/dashboard/reunions/${reunion.id}`}>
                    <Button size="sm" className="bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-xs h-9 px-4 rounded-xl shadow-sm gap-1">
                      Accéder à la Séance <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE REUNION MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <Card className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Convoquer une Réunion de Travail</h2>
                <p className="text-xs text-slate-500">Programmez la séance, l'ordre du jour et convoquez les membres.</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="rtitre" className="text-xs font-extrabold text-slate-700">Titre de la Réunion *</Label>
                <Input
                  id="rtitre"
                  required
                  placeholder="Ex: Séance Ordinaire du Bureau Exécutif #4"
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-700">Type de Réunion *</Label>
                  <select
                    value={formData.type_reunion}
                    onChange={async (e) => {
                      const newType = e.target.value;
                      setFormData({ ...formData, type_reunion: newType });
                      const { getEligibleMembersForReunion } = await import('@/app/actions/reunions');
                      const eligible = await getEligibleMembersForReunion(newType, formData.commission_id);
                      setFormData(prev => ({
                        ...prev,
                        type_reunion: newType,
                        convoques_ids: eligible.map((m: any) => m.id)
                      }));
                    }}
                    className="w-full h-10 text-xs rounded-xl border border-slate-200 font-medium bg-white px-3"
                  >
                    {isBureauUser && <option value="bureau">Réunion du Bureau Exécutif</option>}
                    {isBureauUser && <option value="reunion_ca">Réunion du Conseil d'Administration (CA)</option>}
                    {isBureauUser && <option value="president_commissions">Président & Responsables de Commissions</option>}
                    {isBureauUser && <option value="inter_commissions">Réunion Inter-Commissions</option>}
                    {(isBureauUser || isCommLeaderUser) && <option value="commission">Séance de Commission Dédiée</option>}
                    <option value="extraordinaire">Réunion de Projet / Ad Hoc</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-700">Format *</Label>
                  <select
                    value={formData.format_reunion}
                    onChange={(e) => setFormData({ ...formData, format_reunion: e.target.value })}
                    className="w-full h-10 text-xs rounded-xl border border-slate-200 font-medium bg-white px-3"
                  >
                    <option value="presentiel">En Présentiel (Physique)</option>
                    <option value="en_ligne">En Ligne (Visioconférence)</option>
                    <option value="hybride">Hybride (Présentiel + Visio)</option>
                  </select>
                </div>
              </div>

              {formData.type_reunion === 'commission' && (
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-700">Commission Concernée</Label>
                  <select
                    value={formData.commission_id}
                    onChange={async (e) => {
                      const commId = e.target.value;
                      const { getEligibleMembersForReunion } = await import('@/app/actions/reunions');
                      const eligible = await getEligibleMembersForReunion('commission', commId);
                      setFormData(prev => ({
                        ...prev,
                        commission_id: commId,
                        convoques_ids: eligible.map((m: any) => m.id)
                      }));
                    }}
                    className="w-full h-10 text-xs rounded-xl border border-slate-200 font-medium bg-white px-3"
                  >
                    <option value="">Sélectionnez une commission</option>
                    {commissions.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="rstart" className="text-xs font-extrabold text-slate-700">Date et Heure de Début *</Label>
                  <Input
                    id="rstart"
                    type="datetime-local"
                    required
                    value={formData.date_debut}
                    onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rend" className="text-xs font-extrabold text-slate-700">Heure de Fin Prévue (Optionnel)</Label>
                  <Input
                    id="rend"
                    type="datetime-local"
                    value={formData.date_fin}
                    onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="rlieu" className="text-xs font-extrabold text-slate-700">Lieu physique (Salle / Local)</Label>
                  <Input
                    id="rlieu"
                    placeholder="Ex: Local UQO Pavillon Alexandre-Taché"
                    value={formData.lieu}
                    onChange={(e) => setFormData({ ...formData, lieu: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rvisio" className="text-xs font-extrabold text-slate-700">Lien Visioconférence (Meet/Teams)</Label>
                  <Input
                    id="rvisio"
                    placeholder="https://meet.google.com/..."
                    value={formData.lien_visio}
                    onChange={(e) => setFormData({ ...formData, lien_visio: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="rdesc" className="text-xs font-extrabold text-slate-700">Description / Objectifs de la séance</Label>
                <Textarea
                  id="rdesc"
                  rows={2}
                  placeholder="Contexte et enjeux de la réunion..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              {/* Order of the Day pre-fill */}
              <div className="space-y-1">
                <Label htmlFor="rodj" className="text-xs font-extrabold text-slate-700">Points de l'Ordre du Jour (Un point par ligne)</Label>
                <Textarea
                  id="rodj"
                  rows={3}
                  placeholder={"1. Approbation de l'ordre du jour\n2. Bilan financier du trimestre\n3. Tour de table des commissions"}
                  value={formData.odj_text}
                  onChange={(e) => setFormData({ ...formData, odj_text: e.target.value })}
                  className="rounded-xl text-xs font-mono"
                />
              </div>

              {/* Convocations Target & Checkable Members list */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-extrabold text-slate-800">
                    Membres Convoqués ({formData.convoques_ids.length} sélectionné(s))
                  </Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, convoques_ids: members.map(m => m.id) })}
                      className="text-[10px] text-blue-950 font-bold hover:underline"
                    >
                      Tout cocher
                    </button>
                    <span className="text-[10px] text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, convoques_ids: [] })}
                      className="text-[10px] text-slate-500 font-bold hover:underline"
                    >
                      Tout décocher
                    </button>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-white rounded-xl border border-slate-200">
                  {members.map(m => {
                    const isChecked = formData.convoques_ids.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, convoques_ids: [...formData.convoques_ids, m.id] });
                              } else {
                                setFormData({ ...formData, convoques_ids: formData.convoques_ids.filter(id => id !== m.id) });
                              }
                            }}
                            className="rounded text-blue-950 focus:ring-blue-950"
                          />
                          <span className="font-semibold text-slate-800">{m.prenom} {m.nom}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">{m.email}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl text-xs font-bold">
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-950 hover:bg-blue-900 text-white font-extrabold rounded-xl text-xs h-10 px-5">
                  {isSubmitting ? 'Enregistrement...' : 'Convoquer la Réunion'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
