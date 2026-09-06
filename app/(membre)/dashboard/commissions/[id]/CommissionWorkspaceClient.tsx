'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Calendar,
  FileText,
  MessageSquare,
  DollarSign,
  Plus,
  ArrowLeft,
  Crown,
  Shield,
  Clock,
  MapPin,
  Download,
  ExternalLink,
  Target,
  CheckCircle2,
  ListTodo,
  Edit2,
  Trash2,
  UserCheck,
  Percent,
  Sparkles,
  ChevronRight,
  Sliders,
  Mail,
  Phone
} from 'lucide-react';
import Link from 'next/link';
import {
  createCommissionMeeting,
  createCommissionMission,
  updateCommissionMission,
  deleteCommissionMission,
  createCommissionObjectif,
  deleteCommissionObjectif
} from '@/app/actions/commissions-workspace';
import { createTaskWithGovernance, updateAssigneeProgress } from '@/app/actions/taches';

interface CommissionWorkspaceClientProps {
  commission: any;
  responsableProfile: any;
  responsableAdjointProfile: any;
  userRole: string | null;
  isMember: boolean;
  isLeader: boolean;
  members: any[];
  missions: any[];
  objectifs: any[];
  meetings: any[];
  budgetSummary: {
    budgetAnnuel: number;
    totalDepense: number;
    soldeDisponible: number;
  };
  tasks: any[];
  documents: any[];
  forums: any[];
  currentUserId: string;
}

export default function CommissionWorkspaceClient({
  commission,
  responsableProfile,
  responsableAdjointProfile,
  userRole,
  isMember,
  isLeader,
  members,
  missions,
  objectifs,
  meetings,
  budgetSummary,
  tasks,
  documents,
  forums,
  currentUserId,
}: CommissionWorkspaceClientProps) {
  // Combine Responsable, Responsable Adjoint, and statutory members into a unified, complete members list
  const unifiedMembers = useMemo(() => {
    const map = new Map<string, any>();

    if (responsableProfile) {
      map.set(responsableProfile.id, {
        id: responsableProfile.id,
        prenom: responsableProfile.prenom,
        nom: responsableProfile.nom,
        email: responsableProfile.email,
        telephone: responsableProfile.telephone,
        avatar_url: responsableProfile.avatar_url,
        role_commission: 'Responsable Principal',
        isLead: true,
      });
    }

    if (responsableAdjointProfile) {
      map.set(responsableAdjointProfile.id, {
        id: responsableAdjointProfile.id,
        prenom: responsableAdjointProfile.prenom,
        nom: responsableAdjointProfile.nom,
        email: responsableAdjointProfile.email,
        telephone: responsableAdjointProfile.telephone,
        avatar_url: responsableAdjointProfile.avatar_url,
        role_commission: 'Responsable Adjoint',
        isLead: true,
      });
    }

    (members || []).forEach((m: any) => {
      const p = m.profiles;
      if (p && !map.has(p.id)) {
        map.set(p.id, {
          id: p.id,
          prenom: p.prenom,
          nom: p.nom,
          email: p.email,
          telephone: p.telephone,
          avatar_url: p.avatar_url,
          role_commission: m.role_commission || 'Membre actif',
          isLead: ['president', 'responsable', 'vice_president'].includes((m.role_commission || '').toLowerCase()),
        });
      }
    });

    return Array.from(map.values());
  }, [responsableProfile, responsableAdjointProfile, members]);

  // Modal States
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [showObjectifModal, setShowObjectifModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Form States - Meetings
  const [meetingTitre, setMeetingTitre] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingOrdre, setMeetingOrdre] = useState('');
  const [meetingLieu, setMeetingLieu] = useState('');
  const [isSubmittingMeeting, setIsSubmittingMeeting] = useState(false);

  // Form States - Missions
  const [editingMission, setEditingMission] = useState<any>(null);
  const [missionNum, setMissionNum] = useState<number | ''>('');
  const [missionTitre, setMissionTitre] = useState('');
  const [missionDesc, setMissionDesc] = useState('');
  const [isSubmittingMission, setIsSubmittingMission] = useState(false);

  // Form States - Objectifs
  const [objTitre, setObjTitre] = useState('');
  const [objDesc, setObjDesc] = useState('');
  const [objDebut, setObjDebut] = useState('');
  const [objEcheance, setObjEcheance] = useState('');
  const [objPriorite, setObjPriorite] = useState('moyenne');
  const [selectedMissionIds, setSelectedMissionIds] = useState<string[]>([]);
  const [isSubmittingObjectif, setIsSubmittingObjectif] = useState(false);

  // Form States - Tasks
  const [taskTitre, setTaskTitre] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskObjectifId, setTaskObjectifId] = useState('');
  const [taskEcheance, setTaskEcheance] = useState('');
  const [taskPriorite, setTaskPriorite] = useState<'basse' | 'moyenne' | 'haute'>('moyenne');
  const [taskSelectedAssigneeIds, setTaskSelectedAssigneeIds] = useState<string[]>([]);
  const [taskLeadId, setTaskLeadId] = useState<string>('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Handlers
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitre || !meetingDate) return;
    setIsSubmittingMeeting(true);
    const res = await createCommissionMeeting({
      commission_id: commission.id,
      titre: meetingTitre,
      date_reunion: meetingDate,
      ordre_du_jour: meetingOrdre,
      lieu_ou_lien: meetingLieu,
    });
    setIsSubmittingMeeting(false);
    if (res.success) {
      alert("Réunion de commission programmée avec succès !");
      setShowMeetingModal(false);
      window.location.reload();
    } else {
      alert(res.error || "Erreur lors de la création de la réunion.");
    }
  };

  const handleSaveMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!missionTitre) return;
    setIsSubmittingMission(true);
    if (editingMission) {
      const res = await updateCommissionMission(editingMission.id, {
        commission_id: commission.id,
        titre: missionTitre,
        description: missionDesc,
      });
      if (res.success) {
        setShowMissionModal(false);
        setEditingMission(null);
        window.location.reload();
      } else {
        alert(res.error || "Erreur lors de la mise à jour de la mission.");
      }
    } else {
      const res = await createCommissionMission({
        commission_id: commission.id,
        numero_mission: typeof missionNum === 'number' ? missionNum : undefined,
        titre: missionTitre,
        description: missionDesc,
      });
      if (res.success) {
        setShowMissionModal(false);
        window.location.reload();
      } else {
        alert(res.error || "Erreur lors de la création de la mission.");
      }
    }
    setIsSubmittingMission(false);
  };

  const handleDeleteMission = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette mission ?")) return;
    const res = await deleteCommissionMission(id, commission.id);
    if (res.success) window.location.reload();
    else alert(res.error || "Erreur lors de la suppression.");
  };

  const handleSaveObjectif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objTitre) return;
    setIsSubmittingObjectif(true);
    const res = await createCommissionObjectif({
      commission_id: commission.id,
      titre: objTitre,
      description: objDesc,
      date_debut: objDebut,
      date_echeance: objEcheance,
      priorite: objPriorite,
      mission_ids: selectedMissionIds,
    });
    setIsSubmittingObjectif(false);
    if (res.success) {
      alert("Objectif de commission créé avec succès !");
      setShowObjectifModal(false);
      window.location.reload();
    } else {
      alert(res.error || "Erreur lors de la création de l'objectif.");
    }
  };

  const handleDeleteObjectif = async (id: string) => {
    if (!confirm("Voulez-vous supprimer cet objectif ?")) return;
    const res = await deleteCommissionObjectif(id, commission.id);
    if (res.success) window.location.reload();
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitre) return;
    setIsSubmittingTask(true);

    const assignesMultiples = taskSelectedAssigneeIds.map(pId => ({
      profile_id: pId,
      est_responsable_principal: pId === taskLeadId
    }));

    const res = await createTaskWithGovernance({
      titre: taskTitre,
      description: taskDesc,
      objectifId: taskObjectifId || null,
      dateEcheance: taskEcheance || null,
      priorite: taskPriorite,
      cibleType: 'commission',
      cibleId: commission.id,
      assignesMultiples,
    });

    setIsSubmittingTask(false);
    if (res.success) {
      alert("Tâche créée et affectée avec succès !");
      setShowTaskModal(false);
      window.location.reload();
    } else {
      alert(res.error || "Erreur lors de la création de la tâche.");
    }
  };

  const handleUpdateMyProgress = async (taskId: string, newPct: number) => {
    const res = await updateAssigneeProgress({
      tacheId: taskId,
      pourcentage: newPct,
    });
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error || "Erreur lors de la mise à jour de la progression.");
    }
  };

  const toggleMissionSelection = (id: string) => {
    if (selectedMissionIds.includes(id)) {
      setSelectedMissionIds(selectedMissionIds.filter(m => m !== id));
    } else {
      setSelectedMissionIds([...selectedMissionIds, id]);
    }
  };

  const toggleTaskAssignee = (pId: string) => {
    if (taskSelectedAssigneeIds.includes(pId)) {
      const next = taskSelectedAssigneeIds.filter(id => id !== pId);
      setTaskSelectedAssigneeIds(next);
      if (taskLeadId === pId) setTaskLeadId(next[0] || '');
    } else {
      const next = [...taskSelectedAssigneeIds, pId];
      setTaskSelectedAssigneeIds(next);
      if (!taskLeadId) setTaskLeadId(pId);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-500 absolute top-0 left-0 right-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <Link
              href="/dashboard/commissions"
              className="h-10 w-10 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{commission.nom}</h1>
                {commission.est_systeme && (
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-amber-200">
                    Commission Permanente
                  </span>
                )}
                {userRole && (
                  <span className="bg-blue-950 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    {userRole}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-3xl leading-relaxed">
                {commission.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PROGRAMMER UNE REUNION */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl rounded-3xl bg-white border-none overflow-hidden">
            <div className="h-1.5 bg-blue-950" />
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-lg font-extrabold text-slate-900">Programmer une réunion de commission</CardTitle>
              <CardDescription className="text-xs text-slate-500">Planifiez un temps de travail pour la commission.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleCreateMeeting} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mTitle" className="font-bold text-xs uppercase tracking-wider text-slate-700">Titre de la réunion *</Label>
                  <Input id="mTitle" required value={meetingTitre} onChange={(e) => setMeetingTitre(e.target.value)} placeholder="Ex: Ordre du jour préparatoire AG" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mDate" className="font-bold text-xs uppercase tracking-wider text-slate-700">Date et Heure *</Label>
                  <Input id="mDate" type="datetime-local" required value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mLieu" className="font-bold text-xs uppercase tracking-wider text-slate-700">Lieu ou Lien Visioconférence</Label>
                  <Input id="mLieu" value={meetingLieu} onChange={(e) => setMeetingLieu(e.target.value)} placeholder="Ex: Local UQO 2014 ou Lien Zoom/Teams" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mOrdre" className="font-bold text-xs uppercase tracking-wider text-slate-700">Ordre du jour</Label>
                  <Textarea id="mOrdre" rows={3} value={meetingOrdre} onChange={(e) => setMeetingOrdre(e.target.value)} placeholder="Principaux points à aborder..." className="rounded-xl text-xs" />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="ghost" onClick={() => setShowMeetingModal(false)} className="rounded-xl text-xs font-bold">Annuler</Button>
                  <Button type="submit" disabled={isSubmittingMeeting} className="bg-blue-950 text-white font-extrabold text-xs h-11 rounded-xl px-6">
                    {isSubmittingMeeting ? "Enregistrement..." : "Planifier"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL MISSION CRUD */}
      {showMissionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl rounded-3xl bg-white border-none overflow-hidden">
            <div className="h-1.5 bg-blue-950" />
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-lg font-extrabold text-slate-900">{editingMission ? 'Éditer la Mission' : 'Ajouter une Mission'}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveMission} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Numéro de Mission (1 à 12)</Label>
                  <Input type="number" value={missionNum} onChange={(e) => setMissionNum(e.target.value ? parseInt(e.target.value) : '')} placeholder="Ex: 1" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Titre de la Mission *</Label>
                  <Input required value={missionTitre} onChange={(e) => setMissionTitre(e.target.value)} placeholder="Ex: Produire les contenus visuels..." className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Description détaillée</Label>
                  <Textarea rows={3} value={missionDesc} onChange={(e) => setMissionDesc(e.target.value)} placeholder="Précisions sur la mission..." className="rounded-xl text-xs" />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="ghost" onClick={() => { setShowMissionModal(false); setEditingMission(null); }} className="rounded-xl text-xs font-bold">Annuler</Button>
                  <Button type="submit" disabled={isSubmittingMission} className="bg-blue-950 text-white font-extrabold text-xs h-11 rounded-xl px-6">
                    {isSubmittingMission ? "Sauvegarde..." : "Enregistrer Mission"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL CRÉER OBJECTIF (RELIÉ AUX MISSIONS) */}
      {showObjectifModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl shadow-2xl rounded-3xl bg-white border-none overflow-hidden max-h-[90vh] flex flex-col">
            <div className="h-1.5 bg-emerald-600 shrink-0" />
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <CardTitle className="text-lg font-extrabold text-slate-900">Fixer un Objectif pour la Commission</CardTitle>
              <CardDescription className="text-xs text-slate-500">Un objectif doit être relié à une ou plusieurs des missions permanentes ci-dessous.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4 overflow-y-auto">
              <form onSubmit={handleSaveObjectif} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Titre de l'Objectif *</Label>
                  <Input required value={objTitre} onChange={(e) => setObjTitre(e.target.value)} placeholder="Ex: Publier 5 capsules vidéo d'intégration au Q3" className="h-11 rounded-xl" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Date Début</Label>
                    <Input type="date" value={objDebut} onChange={(e) => setObjDebut(e.target.value)} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Date Échéance</Label>
                    <Input type="date" value={objEcheance} onChange={(e) => setObjEcheance(e.target.value)} className="h-11 rounded-xl" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Priorité</Label>
                  <select value={objPriorite} onChange={(e) => setObjPriorite(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 text-xs font-bold px-3">
                    <option value="basse">Basse</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="haute">Haute</option>
                  </select>
                </div>

                {/* Sélection des missions reliées */}
                <div className="space-y-2 pt-2">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center justify-between">
                    <span>Missions cibles associées *</span>
                    <span className="text-slate-400 font-normal">({selectedMissionIds.length} sélectionnée(s))</span>
                  </Label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
                    {missions.map(m => {
                      const isSel = selectedMissionIds.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleMissionSelection(m.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                            isSel ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-xs">
                            <span className="font-extrabold mr-2">Mission #{m.numero_mission}:</span> {m.titre}
                          </span>
                          {isSel && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Description / Détails</Label>
                  <Textarea rows={2} value={objDesc} onChange={(e) => setObjDesc(e.target.value)} placeholder="Précisions sur les résultats attendus..." className="rounded-xl text-xs" />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="ghost" onClick={() => setShowObjectifModal(false)} className="rounded-xl text-xs font-bold">Annuler</Button>
                  <Button type="submit" disabled={isSubmittingObjectif} className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs h-11 rounded-xl px-6">
                    {isSubmittingObjectif ? "Création..." : "Fixer l'Objectif"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL CRÉER UNE TÂCHE MULTI-MEMBRES */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl shadow-2xl rounded-3xl bg-white border-none overflow-hidden max-h-[90vh] flex flex-col">
            <div className="h-1.5 bg-blue-950 shrink-0" />
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <CardTitle className="text-lg font-extrabold text-slate-900">Créer une Tâche de Commission (Multi-membres)</CardTitle>
              <CardDescription className="text-xs text-slate-500">Sélectionnez l'Objectif à atteindre et les membres affectés.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4 overflow-y-auto">
              <form onSubmit={handleSaveTask} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Titre de la Tâche *</Label>
                  <Input required value={taskTitre} onChange={(e) => setTaskTitre(e.target.value)} placeholder="Ex: Monter la vidéo promotionnelle du gala" className="h-11 rounded-xl border-slate-200" />
                </div>

                {/* Sélection de l'objectif de commission */}
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Objectif Stratégique Cible</Label>
                  <select value={taskObjectifId} onChange={(e) => setTaskObjectifId(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 text-xs font-bold px-3">
                    <option value="">-- Aucun (Tâche courante de fonctionnement) --</option>
                    {objectifs.map(o => (
                      <option key={o.id} value={o.id}>🎯 {o.titre}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Date Échéance</Label>
                    <Input type="date" value={taskEcheance} onChange={(e) => setTaskEcheance(e.target.value)} className="h-11 rounded-xl border-slate-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Priorité</Label>
                    <select value={taskPriorite} onChange={(e) => setTaskPriorite(e.target.value as any)} className="w-full h-11 rounded-xl border border-slate-200 text-xs font-bold px-3">
                      <option value="basse">Basse</option>
                      <option value="moyenne">Moyenne</option>
                      <option value="haute">Haute</option>
                    </select>
                  </div>
                </div>

                {/* Affectation Multi-membres (Saisie interactive & Membres unifiés) */}
                <div className="space-y-2 pt-2">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center justify-between">
                    <span>Membres Affectés</span>
                    <span className="text-slate-400 font-normal">({taskSelectedAssigneeIds.length} affecté(s))</span>
                  </Label>
                  
                  {unifiedMembers.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 italic text-center">
                      Aucun membre actuellement configuré dans cette commission.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
                      {unifiedMembers.map((prof: any) => {
                        const isSel = taskSelectedAssigneeIds.includes(prof.id);
                        const isLead = taskLeadId === prof.id;

                        return (
                          <div key={prof.id} className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            isSel ? 'bg-blue-50/80 border-blue-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}>
                            <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isSel}
                                onChange={() => toggleTaskAssignee(prof.id)}
                                className="rounded text-blue-950 w-4 h-4 cursor-pointer"
                              />
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-900 block truncate">
                                  {prof.prenom} {prof.nom}
                                </span>
                                <span className="text-[10px] text-slate-500 block truncate">
                                  {prof.role_commission}
                                </span>
                              </div>
                            </label>

                            {isSel && (
                              <button
                                type="button"
                                onClick={() => setTaskLeadId(prof.id)}
                                className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border transition-all shrink-0 ${
                                  isLead ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {isLead ? '★ Lead Principal' : 'Définir Lead'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Description</Label>
                  <Textarea rows={2} value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} placeholder="Consignes sur la tâche..." className="rounded-xl text-xs border-slate-200" />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="ghost" onClick={() => setShowTaskModal(false)} className="rounded-xl text-xs font-bold">Annuler</Button>
                  <Button type="submit" disabled={isSubmittingTask} className="bg-blue-950 text-white font-extrabold text-xs h-11 rounded-xl px-6">
                    {isSubmittingTask ? "Affectation..." : "Créer et Affecter Tâche"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MAIN TABS CONTAINER */}
      <Tabs defaultValue="missions" className="w-full flex flex-col gap-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 bg-slate-100/90 p-1.5 rounded-2xl gap-1 border border-slate-200/60">
          <TabsTrigger
            value="missions"
            className="rounded-xl text-xs font-bold py-2.5 gap-1.5 data-[state=active]:bg-blue-950 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            <ListTodo className="w-4 h-4" /> Missions ({missions.length})
          </TabsTrigger>
          <TabsTrigger
            value="objectifs"
            className="rounded-xl text-xs font-bold py-2.5 gap-1.5 data-[state=active]:bg-blue-950 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            <Target className="w-4 h-4" /> Objectifs ({objectifs.length})
          </TabsTrigger>
          <TabsTrigger
            value="taches"
            className="rounded-xl text-xs font-bold py-2.5 gap-1.5 data-[state=active]:bg-blue-950 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            <FileText className="w-4 h-4" /> Tâches ({tasks.length})
          </TabsTrigger>
          <TabsTrigger
            value="organigramme"
            className="rounded-xl text-xs font-bold py-2.5 gap-1.5 data-[state=active]:bg-blue-950 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            <Users className="w-4 h-4" /> Membres ({unifiedMembers.length})
          </TabsTrigger>
          <TabsTrigger
            value="reunions"
            className="rounded-xl text-xs font-bold py-2.5 gap-1.5 data-[state=active]:bg-blue-950 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            <Calendar className="w-4 h-4" /> Réunions ({meetings.length})
          </TabsTrigger>
          <TabsTrigger
            value="budget"
            className="rounded-xl text-xs font-bold py-2.5 gap-1.5 data-[state=active]:bg-blue-950 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            <DollarSign className="w-4 h-4" /> Budget (${budgetSummary.budgetAnnuel})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MISSIONS OFFICIELLES (12 MISSIONS & CRUD) */}
        <TabsContent value="missions" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Missions Officielles de la Commission</h3>
              <p className="text-xs text-slate-500">Missions permanentes définissant les responsabilités statutaires de cette commission.</p>
            </div>
            {isLeader && (
              <Button
                onClick={() => { setEditingMission(null); setMissionTitre(''); setMissionDesc(''); setShowMissionModal(true); }}
                className="bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-sm gap-1.5 self-start sm:self-center"
              >
                <Plus className="w-4 h-4" /> Ajouter une Mission
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {missions.map((m) => (
              <Card key={m.id} className="border border-slate-200/80 shadow-md rounded-2xl bg-white p-5 flex flex-col justify-between hover:shadow-lg transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-950 px-3 py-1 rounded-full border border-blue-200">
                      Mission #{m.numero_mission}
                    </span>
                    {isLeader && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingMission(m); setMissionNum(m.numero_mission); setMissionTitre(m.titre); setMissionDesc(m.description || ''); setShowMissionModal(true); }}
                          className="p-1.5 text-slate-400 hover:text-blue-950 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMission(m.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{m.titre}</h4>
                  {m.description && <p className="text-xs text-slate-600 leading-relaxed">{m.description}</p>}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 2: OBJECTIFS STRATÉGIQUES (RELIÉS AUX MISSIONS) */}
        <TabsContent value="objectifs" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Objectifs Stratégiques & Alignement</h3>
              <p className="text-xs text-slate-500">Les objectifs se déclinent en tâches et ciblent les missions permanentes de la commission.</p>
            </div>
            {isLeader && (
              <Button
                onClick={() => setShowObjectifModal(true)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-sm gap-1.5"
              >
                <Plus className="w-4 h-4" /> Nouvel Objectif
              </Button>
            )}
          </div>

          {objectifs.length === 0 ? (
            <Card className="border border-dashed border-slate-200 rounded-3xl bg-white p-12 text-center space-y-3">
              <Target className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-extrabold text-slate-800 text-sm">Aucun objectif défini pour le moment</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">Fixez des objectifs pour piloter l'action de la commission et évaluer les résultats.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {objectifs.map((obj) => {
                const linkedMissions = (obj.missions || []).map((m: any) => m.mission).filter(Boolean);

                return (
                  <Card key={obj.id} className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                            obj.statut === 'atteint' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-blue-50 text-blue-950 border border-blue-200'
                          }`}>
                            {obj.statut === 'atteint' ? ' Atteint' : '🎯 En cours'}
                          </span>
                          <span className="text-xs text-slate-400 font-bold uppercase">Priorité {obj.priorite}</span>
                        </div>
                        <h4 className="text-lg font-extrabold text-slate-900">{obj.titre}</h4>
                        {obj.description && <p className="text-xs text-slate-600 mt-1">{obj.description}</p>}
                      </div>
                      {isLeader && (
                        <button onClick={() => handleDeleteObjectif(obj.id)} className="text-slate-400 hover:text-red-600 p-2 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Missions Cibles Liées */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Missions cibles :</span>
                      <div className="flex flex-wrap gap-1.5">
                        {linkedMissions.map((lm: any) => (
                          <span key={lm.id} className="text-xs bg-slate-100 text-slate-800 font-bold px-3 py-1 rounded-xl border border-slate-200 flex items-center gap-1">
                            <span className="text-blue-950 font-extrabold">#{lm.numero_mission}</span> {lm.titre}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: TÂCHES MULTI-MEMBRES & EVOLUTION EN % */}
        <TabsContent value="taches" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Tâches de la Commission & Suivi Individuel</h3>
              <p className="text-xs text-slate-500">Chaque membre fait évoluer son avancement personnel (0% à 100%).</p>
            </div>
            {isLeader && (
              <Button
                onClick={() => setShowTaskModal(true)}
                className="bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-sm gap-1.5"
              >
                <Plus className="w-4 h-4" /> Nouvelle Tâche
              </Button>
            )}
          </div>

          {tasks.length === 0 ? (
            <Card className="border border-dashed border-slate-200 rounded-3xl bg-white p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-extrabold text-slate-800 text-sm">Aucune tâche en cours pour cette commission</h4>
            </Card>
          ) : (
            <div className="space-y-4">
              {tasks.map((t: any) => {
                const assignations = t.assignations || [];

                return (
                  <Card key={t.id} className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                      <div>
                        {t.objectif && (
                          <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-block mb-1">
                            🎯 Objectif : {t.objectif.titre}
                          </span>
                        )}
                        <h4 className="text-base font-extrabold text-slate-900">{t.titre}</h4>
                        {t.description && <p className="text-xs text-slate-500 mt-1">{t.description}</p>}
                      </div>

                      {/* Jauge globale de la tâche */}
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Progression Globale</span>
                          <span className="font-extrabold text-sm text-slate-900">{t.progression_globale || 0} %</span>
                        </div>
                        <div className="w-16 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-950 h-full transition-all"
                            style={{ width: `${t.progression_globale || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Membres assignés & Progression individuelle */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        Membres affectés ({assignations.length}) :
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {assignations.map((a: any) => {
                          const prof = a.profile;
                          if (!prof) return null;
                          const isMe = prof.id === currentUserId;

                          return (
                            <div key={a.id} className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                              isMe ? 'bg-blue-50/60 border-blue-200' : 'bg-slate-50/60 border-slate-200'
                            }`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-blue-950 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                  {prof.prenom?.[0]}{prof.nom?.[0]}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-slate-900 block truncate">
                                    {prof.prenom} {prof.nom} {isMe && '(Vous)'}
                                  </span>
                                  {a.est_responsable_principal && (
                                    <span className="text-[9px] text-amber-800 font-extrabold bg-amber-100 px-1.5 py-0.5 rounded">
                                      ★ Lead
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {isMe ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={a.pourcentage_progression}
                                      onChange={(e) => handleUpdateMyProgress(t.id, parseInt(e.target.value) || 0)}
                                      className="w-14 h-8 rounded-lg border border-blue-300 text-xs font-extrabold text-center bg-white"
                                    />
                                    <span className="text-xs font-bold">%</span>
                                  </div>
                                ) : (
                                  <span className="text-xs font-extrabold bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                    {a.pourcentage_progression} %
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 4: ORGANIGRAMME & TOUS LES MEMBRES CONFIGURÉS */}
        <TabsContent value="organigramme" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Membres Configurés de la Commission</h3>
              <p className="text-xs text-slate-500">Liste complète des responsables et membres participant aux activités.</p>
            </div>
          </div>

          <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
            <CardContent className="p-0 divide-y divide-slate-100">
              {unifiedMembers.length === 0 ? (
                <p className="text-center py-10 text-slate-400 text-xs italic">Aucun membre configuré pour cette commission.</p>
              ) : (
                unifiedMembers.map((m: any) => (
                  <div key={m.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-950 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {m.prenom?.[0]}{m.nom?.[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{m.prenom} {m.nom}</span>
                          {m.role_commission === 'Responsable Principal' && (
                            <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Crown className="w-3 h-3 text-amber-600" /> Responsable Principal
                            </span>
                          )}
                          {m.role_commission === 'Responsable Adjoint' && (
                            <span className="text-[10px] font-extrabold bg-blue-100 text-blue-950 border border-blue-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Shield className="w-3 h-3 text-blue-950" /> Responsable Adjoint
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 capitalize">{m.role_commission}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 font-medium space-y-0.5 self-start sm:self-center">
                      {m.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {m.email}</p>}
                      {m.telephone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {m.telephone}</p>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: RÉUNIONS */}
        <TabsContent value="reunions" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Réunions de la Commission</h3>
              <p className="text-xs text-slate-500">Séances de travail et ordre du jour programmés.</p>
            </div>
            {isLeader && (
              <Button
                onClick={() => setShowMeetingModal(true)}
                className="bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-sm gap-1.5 self-start sm:self-center"
              >
                <Plus className="w-4 h-4" /> Programmer une Réunion
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {meetings.length === 0 ? (
              <Card className="md:col-span-2 border border-dashed border-slate-200 rounded-3xl bg-white p-12 text-center">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-xs font-bold">Aucune réunion de commission programmée.</p>
              </Card>
            ) : (
              meetings.map((m: any) => (
                <Card key={m.id} className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-3">
                  <h4 className="font-extrabold text-base text-slate-900">{m.titre}</h4>
                  <div className="text-xs text-slate-600 space-y-1.5 font-medium border-t border-b py-3">
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-950" />
                      {new Date(m.date_reunion).toLocaleDateString('fr-CA', { dateStyle: 'full' })}
                    </p>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* TAB 6: BUDGET */}
        <TabsContent value="budget" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Budget Annuel Alloué</span>
              <p className="text-3xl font-extrabold text-blue-950">${budgetSummary.budgetAnnuel.toFixed(2)} CAD</p>
            </Card>

            <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Total Dépenses Approuvées</span>
              <p className="text-3xl font-extrabold text-amber-600">${budgetSummary.totalDepense.toFixed(2)} CAD</p>
            </Card>

            <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Solde Disponible</span>
              <p className="text-3xl font-extrabold text-emerald-600">${budgetSummary.soldeDisponible.toFixed(2)} CAD</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
