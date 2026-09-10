'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
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
  Phone,
  History,
  Paperclip,
  Eye,
  X
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
import { createTaskWithGovernance } from '@/app/actions/taches';
import { submitExpenseClaim, processCommissionExpenseDecision } from '@/app/actions/finances';
import { createClient } from '@/lib/supabase/client';

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
  expenses?: any[];
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
  expenses = [],
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
  const [historyModalData, setHistoryModalData] = useState<{ task: any; member: any } | null>(null);

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

  // Form States - Expenses / Notes de frais
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseTitre, setExpenseTitre] = useState('');
  const [expenseMontant, setExpenseMontant] = useState('');
  const [expenseCategorie, setExpenseCategorie] = useState('materiel');
  const [expenseTaskId, setExpenseTaskId] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseFile, setExpenseFile] = useState<File | null>(null);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const montantNum = parseFloat(expenseMontant);
    if (!expenseTitre || !montantNum || montantNum <= 0) {
      alert("Veuillez remplir le titre et un montant valide.");
      return;
    }
    setIsSubmittingExpense(true);
    let justificatifUrl = '';

    if (expenseFile) {
      const supabase = createClient();
      const fileName = `depenses/${Date.now()}_${expenseFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(fileName, expenseFile);

      if (!error && data) {
        const { data: pubUrl } = supabase.storage.from('documents').getPublicUrl(fileName);
        justificatifUrl = pubUrl.publicUrl;
      }
    }

    const res = await submitExpenseClaim({
      titre: expenseTitre,
      montant: montantNum,
      categorie: expenseCategorie,
      description: expenseDesc,
      commission_id: commission.id,
      tache_id: expenseTaskId || undefined,
      justificatif_url: justificatifUrl || undefined,
    });

    setIsSubmittingExpense(false);
    if (res.success) {
      alert("Demande de dépense soumise avec succès ! Elle a été transmise dans le circuit de validation.");
      setShowExpenseModal(false);
      setExpenseTitre('');
      setExpenseMontant('');
      setExpenseDesc('');
      setExpenseTaskId('');
      setExpenseFile(null);
      window.location.reload();
    } else {
      alert(res.error || "Erreur lors de la soumission de la dépense.");
    }
  };

  // Decision Modal State (Pre-validation by Commission Responsable / Adjoint)
  const [decisionModalData, setDecisionModalData] = useState<{
    depense: any;
    decision: 'valide' | 'modifications_demandees' | 'rejete';
  } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  const handleExecuteDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionModalData) return;
    setIsSubmittingDecision(true);

    const res = await processCommissionExpenseDecision({
      depenseId: decisionModalData.depense.id,
      decision: decisionModalData.decision,
      notes: decisionNotes || undefined,
    });

    setIsSubmittingDecision(false);
    if (res.success) {
      alert(
        decisionModalData.decision === 'valide'
          ? "Demande validée et transmise au circuit financier !"
          : decisionModalData.decision === 'modifications_demandees'
          ? "Demande de modifications transmise au membre !"
          : "Demande rejetée avec remarques."
      );
      setDecisionModalData(null);
      setDecisionNotes('');
      window.location.reload();
    } else {
      alert(res.error || "Erreur lors du traitement de la décision.");
    }
  };

  // List of tasks where current user is Lead (or if user is Commission Leader)
  const leadTasks = useMemo(() => {
    if (isLeader) return tasks;
    return tasks.filter((t: any) => {
      const assignations = t.assignations || [];
      return assignations.some(
        (a: any) => (a.profile?.id || a.profile_id) === currentUserId && a.est_responsable_principal
      );
    });
  }, [tasks, isLeader, currentUserId]);

  const canSubmitExpense = isLeader || leadTasks.length > 0;

  // Visibility filtering for expenses in Budget tab:
  // Responsable and Responsable Adjoint see all expenses of the commission.
  // Other members only see expenses for tasks in which they are an assigned member (or author).
  const visibleExpenses = useMemo(() => {
    const isResponsable = responsableProfile?.id === currentUserId;
    const isResponsableAdjoint = responsableAdjointProfile?.id === currentUserId;
    if (isLeader || isResponsable || isResponsableAdjoint) {
      return expenses;
    }

    return expenses.filter((dep: any) => {
      if (dep.demandeur_id === currentUserId) return true;
      const taskAssignations = dep.taches?.assignations || [];
      const isTaskMember = taskAssignations.some(
        (a: any) => (a.profile?.id || a.profile_id) === currentUserId
      );
      return isTaskMember;
    });
  }, [expenses, isLeader, responsableProfile, responsableAdjointProfile, currentUserId]);

  // 360° Commission Overview Statistics
  const overviewStats = useMemo(() => {
    const allTasks = tasks || [];
    const completedTasks = allTasks.filter((t: any) => (t.progression_globale || 0) >= 100);
    const inProgressTasks = allTasks.filter((t: any) => (t.progression_globale || 0) > 0 && (t.progression_globale || 0) < 100);
    const notStartedTasks = allTasks.filter((t: any) => !t.progression_globale || t.progression_globale === 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const delayedTasks = allTasks.filter((t: any) => t.echeance && t.echeance < todayStr && (t.progression_globale || 0) < 100);

    const avgTaskProgression = allTasks.length > 0
      ? Math.round(allTasks.reduce((acc: number, t: any) => acc + (t.progression_globale || 0), 0) / allTasks.length)
      : 0;

    // Workload calculation for unified members
    const memberWorkload = unifiedMembers.map((m: any) => {
      const assignedTasks = allTasks.filter((t: any) => {
        const assignations = t.assignations || [];
        return assignations.some((a: any) => (a.profile?.id || a.profile_id) === m.id);
      });

      const leadTasksCount = assignedTasks.filter((t: any) => {
        const assignations = t.assignations || [];
        return assignations.some((a: any) => (a.profile?.id || a.profile_id) === m.id && a.est_responsable_principal);
      }).length;

      const memberCompleted = assignedTasks.filter((t: any) => (t.progression_globale || 0) >= 100).length;

      return {
        member: m,
        totalTasks: assignedTasks.length,
        leadTasksCount,
        completedTasksCount: memberCompleted,
        inProgressTasksCount: assignedTasks.length - memberCompleted,
        workloadRate: allTasks.length > 0 ? Math.round((assignedTasks.length / allTasks.length) * 100) : 0,
      };
    });

    return {
      totalTasks: allTasks.length,
      completedTasksCount: completedTasks.length,
      inProgressTasksCount: inProgressTasks.length,
      notStartedTasksCount: notStartedTasks.length,
      delayedTasksCount: delayedTasks.length,
      delayedTasks,
      avgTaskProgression,
      memberWorkload,
    };
  }, [tasks, unifiedMembers]);

  // Financial Analytics & Detailed Budget Dashboard Stats
  const budgetStats = useMemo(() => {
    const totalAllocated = budgetSummary.budgetAnnuel || 0;
    const depensesList = expenses || [];

    const approvedList = depensesList.filter((d: any) => d.statut === 'approuve' || d.statut === 'paye');
    const pendingCommList = depensesList.filter((d: any) => d.statut_commission === 'en_attente_validation');
    const modifCommList = depensesList.filter((d: any) => d.statut_commission === 'modifications_demandees');
    const rejectedCommList = depensesList.filter((d: any) => d.statut_commission === 'rejete');

    const totalApprovedAmount = approvedList.reduce((acc: number, d: any) => acc + (Number(d.montant) || 0), 0);
    const totalPendingCommAmount = pendingCommList.reduce((acc: number, d: any) => acc + (Number(d.montant) || 0), 0);

    // Financed tasks vs Unfunded tasks
    const taskExpenseMap = new Set(depensesList.map((d: any) => d.tache_id).filter(Boolean));
    const tasksFinanced = (tasks || []).filter((t: any) => taskExpenseMap.has(t.id));
    const tasksNotFinanced = (tasks || []).filter((t: any) => !taskExpenseMap.has(t.id));

    const percentConsumed = totalAllocated > 0 ? Math.min(100, (totalApprovedAmount / totalAllocated) * 100) : 0;
    const remainingBalance = Math.max(0, totalAllocated - totalApprovedAmount);

    return {
      totalAllocated,
      totalApprovedAmount,
      totalPendingCommAmount,
      approvedCount: approvedList.length,
      pendingCommCount: pendingCommList.length,
      modifCommCount: modifCommList.length,
      rejectedCommCount: rejectedCommList.length,
      tasksFinanced,
      tasksNotFinanced,
      percentConsumed,
      remainingBalance,
    };
  }, [budgetSummary, expenses, tasks]);
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
      <Tabs defaultValue="overview" className="w-full flex flex-col gap-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-7 bg-slate-100/90 p-1.5 rounded-2xl gap-1 border border-slate-200/60">
          <TabsTrigger
            value="overview"
            className="rounded-xl text-xs font-bold py-2.5 gap-1.5 data-[state=active]:bg-blue-950 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            <LayoutDashboard className="w-4 h-4" /> Vue d'ensemble
          </TabsTrigger>
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

        {/* TAB 0: VUE D'ENSEMBLE (TABLEAU DE BORD 360°) */}
        <TabsContent value="overview" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-blue-950" />
                Vue d'ensemble & Dashboard Général
              </h3>
              <p className="text-xs text-slate-500 font-medium">Synthèse globale des objectifs, tâches, charge de travail des membres et finances de la commission.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold bg-blue-50 text-blue-950 px-3 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                Avancement Global : <strong className="text-blue-950 text-sm">{overviewStats.avgTaskProgression}%</strong>
              </span>
            </div>
          </div>

          {/* KPI CARDS 360° */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="border border-slate-200/80 shadow-sm rounded-3xl bg-white p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Gouvernance</span>
                <Target className="w-4 h-4 text-blue-950" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900">{objectifs.length} <span className="text-xs text-slate-500 font-bold">Objectifs</span></p>
              <p className="text-[11px] text-slate-500 font-medium">{missions.length} mission(s) officielle(s) rattachée(s)</p>
            </Card>

            <Card className="border border-slate-200/80 shadow-sm rounded-3xl bg-white p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Suivi des Tâches</span>
                <FileText className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900">{overviewStats.completedTasksCount} / {overviewStats.totalTasks} <span className="text-xs text-slate-500 font-bold">Terminées</span></p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${overviewStats.totalTasks > 0 ? (overviewStats.completedTasksCount / overviewStats.totalTasks) * 100 : 0}%` }}
                />
              </div>
            </Card>

            <Card className="border border-slate-200/80 shadow-sm rounded-3xl bg-white p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Finances Commission</span>
                <DollarSign className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900">${budgetStats.totalApprovedAmount.toFixed(2)} <span className="text-xs text-slate-500 font-bold">CAD</span></p>
              <p className="text-[11px] text-slate-500 font-medium">Sur budget alloué de ${budgetStats.totalAllocated.toFixed(2)} CAD</p>
            </Card>

            <Card className="border border-slate-200/80 shadow-sm rounded-3xl bg-white p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Équipe & Alertes</span>
                <Users className="w-4 h-4 text-blue-900" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900">{unifiedMembers.length} <span className="text-xs text-slate-500 font-bold">Membres</span></p>
              {overviewStats.delayedTasksCount > 0 ? (
                <p className="text-[11px] text-red-600 font-extrabold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {overviewStats.delayedTasksCount} tâche(s) en retard
                </p>
              ) : (
                <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Aucune tâche en retard
                </p>
              )}
            </Card>
          </div>

          {/* GRID ROW 2: ÉTAT DES TÂCHES & ALERTES DE RETARD */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CARTE DE GESTION & ALERTES SUR LES TÂCHES */}
            <Card className="border border-slate-200/80 shadow-sm rounded-3xl bg-white p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-950" /> Répartition & Avancement des Tâches
                </h4>
                <Link href="#" onClick={(e) => { e.preventDefault(); const el = document.querySelector('[data-state][value="taches"]') as HTMLElement; el?.click(); }} className="text-xs font-bold text-blue-950 hover:underline">
                  Voir tout →
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total</span>
                  <span className="text-xl font-extrabold text-slate-900">{overviewStats.totalTasks}</span>
                </div>
                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200">
                  <span className="text-[10px] font-extrabold uppercase text-blue-700 block">En Cours</span>
                  <span className="text-xl font-extrabold text-blue-950">{overviewStats.inProgressTasksCount}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <span className="text-[10px] font-extrabold uppercase text-emerald-800 block">Terminées</span>
                  <span className="text-xl font-extrabold text-emerald-950">{overviewStats.completedTasksCount}</span>
                </div>
                <div className={`p-3 rounded-2xl border ${overviewStats.delayedTasksCount > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-[10px] font-extrabold uppercase block ${overviewStats.delayedTasksCount > 0 ? 'text-red-700' : 'text-slate-400'}`}>En Retard</span>
                  <span className={`text-xl font-extrabold ${overviewStats.delayedTasksCount > 0 ? 'text-red-900' : 'text-slate-900'}`}>{overviewStats.delayedTasksCount}</span>
                </div>
              </div>

              {/* TÂCHES EN RETARD PARTICULIÈRES */}
              {overviewStats.delayedTasksCount > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <span className="text-xs font-extrabold text-red-900 uppercase tracking-wider block">⚠️ Tâches Dépassant la Date Échéance :</span>
                  <div className="space-y-2">
                    {overviewStats.delayedTasks.map((dt: any) => (
                      <div key={dt.id} className="p-3 bg-red-50/70 border border-red-200 rounded-2xl flex items-center justify-between text-xs">
                        <div>
                          <span className="font-extrabold text-red-950 block">{dt.titre}</span>
                          <span className="text-[11px] text-red-700">Échéance dépassée le : {new Date(dt.echeance).toLocaleDateString('fr-CA')}</span>
                        </div>
                        <Link href={`/dashboard/taches/${dt.id}`} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded-xl transition-colors">
                          Ouvrir Tâche
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* CARTE FINANCEMENT DES TÂCHES & BUDGET */}
            <Card className="border border-slate-200/80 shadow-sm rounded-3xl bg-white p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-700" /> Financement des Tâches & Budget
                </h4>
                {isLeader && (
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Vue Budget
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 block">Tâches Financées</span>
                  <p className="text-2xl font-extrabold text-emerald-950">{budgetStats.tasksFinanced.length}</p>
                  <p className="text-[11px] text-emerald-700 font-medium">Tâches bénéficiant de notes de frais engagées</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Tâches Sans Dépenses</span>
                  <p className="text-2xl font-extrabold text-slate-800">{budgetStats.tasksNotFinanced.length}</p>
                  <p className="text-[11px] text-slate-500 font-medium">Tâches exécutées sans besoins financiers</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Consommation Budgétaire Totale :</span>
                  <span className="font-extrabold text-blue-950">${budgetStats.totalApprovedAmount.toFixed(2)} / ${budgetStats.totalAllocated.toFixed(2)} CAD</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-blue-950 h-full rounded-full transition-all" style={{ width: `${budgetStats.percentConsumed}%` }} />
                </div>
              </div>
            </Card>
          </div>

          {/* GRID ROW 3: CHARGE DE TRAVAIL & ACTIVITÉ DES MEMBRES (TAUX D'OCCUPATION) */}
          <Card className="border border-slate-200/80 shadow-sm rounded-3xl bg-white p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-950" /> Activité & Charge de Travail des Membres
                </h4>
                <p className="text-xs text-slate-500">Taux d'affectation et état d'avancement des tâches par membre de la commission.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {overviewStats.memberWorkload.map((mw: any) => {
                const m = mw.member;
                return (
                  <div key={m.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-950 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm">
                        {m.prenom?.[0]}{m.nom?.[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-extrabold text-slate-900 text-xs truncate">{m.prenom} {m.nom}</h5>
                        <span className="text-[10px] text-slate-500 font-bold block truncate">{m.role_commission}</span>
                      </div>
                      {m.isLead && (
                        <span title="Responsable de commission">
                          <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs border-t border-slate-200/60 pt-2.5">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600">
                        <span>Tâches affectées :</span>
                        <span className="text-slate-900">{mw.totalTasks} ({mw.leadTasksCount} Lead)</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-600">
                        <span>Tâches terminées :</span>
                        <span className="text-emerald-700">{mw.completedTasksCount} / {mw.totalTasks}</span>
                      </div>

                      {/* Barre d'occupation relative */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] font-extrabold uppercase text-slate-400">
                          <span>Charge dans la commission</span>
                          <span className="text-blue-950">{mw.workloadRate}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-950 h-full rounded-full transition-all" style={{ width: `${Math.min(100, mw.workloadRate)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

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
              <p className="text-xs text-slate-500">Visualisation de l'avancement des tâches. L'évolution se fait directement dans la fiche de chaque tâche.</p>
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

                const isResponsable = responsableProfile?.id === currentUserId;
                const isResponsableAdjoint = responsableAdjointProfile?.id === currentUserId;
                const isCoAssignee = assignations.some((a: any) => (a.profile?.id || a.profile_id) === currentUserId);
                const canViewTaskHistory = isLeader || isResponsable || isResponsableAdjoint || isCoAssignee;

                return (
                  <Card key={t.id} className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                      <div>
                        {t.objectif && (
                          <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-block mb-1">
                            🎯 Objectif : {t.objectif.titre}
                          </span>
                        )}
                        <h4 className="text-base font-extrabold text-slate-900">
                          <Link href={`/dashboard/taches/${t.id}`} className="hover:text-blue-600 inline-flex items-center gap-1.5 transition-colors">
                            {t.titre}
                            <ExternalLink className="w-4 h-4 text-slate-400" />
                          </Link>
                        </h4>
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
                                <span className="text-xs font-extrabold bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                  {a.pourcentage_progression} %
                                </span>
                                {canViewTaskHistory && (
                                  <button
                                    type="button"
                                    onClick={() => setHistoryModalData({ task: t, member: prof })}
                                    className="p-1.5 rounded-lg bg-blue-50 text-blue-950 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1 text-[11px] font-bold"
                                    title="Consulter l'historique d'évolution et les documents joints"
                                  >
                                    <History className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Historique & Docs</span>
                                  </button>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Budget & Gestion des Dépenses de la Commission</h3>
              <p className="text-xs text-slate-500">Engagez des demandes de remboursement / notes de frais rattachées aux tâches et objectifs de la commission.</p>
            </div>
            {canSubmitExpense && (
              <Button
                onClick={() => setShowExpenseModal(true)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-sm gap-1.5 self-start sm:self-center"
              >
                <Plus className="w-4 h-4" /> Engager une Dépense / Note de Frais
              </Button>
            )}
          </div>

          {/* TABLEAU DE BORD & CARTES BUDGET (VISIBLES UNIQUEMENT PAR LE RESPONSABLE ET L'ADJOINT) */}
          {isLeader && (
            <div className="space-y-5 bg-slate-50 border border-slate-200/80 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    📊 Tableau de Bord Financier de la Commission
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">Synthèse des enveloppes budgétaires, statuts d'arbitrage et répartition du financement des tâches.</p>
                </div>
                <span className="text-[11px] font-extrabold bg-blue-100 text-blue-950 px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
                  Direction Commission
                </span>
              </div>

              {/* 4 CARTE DE CHIFFRES CLÉS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-200/80 shadow-sm rounded-2xl bg-white p-4 space-y-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Budget Alloué</span>
                  <p className="text-2xl font-extrabold text-blue-950">${budgetStats.totalAllocated.toFixed(2)} <span className="text-xs text-slate-500">CAD</span></p>
                  <p className="text-[10px] text-slate-500 font-medium">Plafond annuel fixe</p>
                </Card>

                <Card className="border border-slate-200/80 shadow-sm rounded-2xl bg-white p-4 space-y-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Dépenses Approuvées</span>
                  <p className="text-2xl font-extrabold text-emerald-600">${budgetStats.totalApprovedAmount.toFixed(2)} <span className="text-xs text-slate-500">CAD</span></p>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${budgetStats.percentConsumed}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold">{budgetStats.percentConsumed.toFixed(1)}% du budget consommé</p>
                </Card>

                <Card className={`border shadow-sm rounded-2xl p-4 space-y-1.5 ${budgetStats.pendingCommCount > 0 ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200/80'}`}>
                  <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider block">En Attente Arbitrage</span>
                  <p className="text-2xl font-extrabold text-amber-900">{budgetStats.pendingCommCount} <span className="text-xs text-amber-700">Demande(s)</span></p>
                  <p className="text-[10px] text-amber-800 font-bold">${budgetStats.totalPendingCommAmount.toFixed(2)} CAD à valider</p>
                </Card>

                <Card className="border border-slate-200/80 shadow-sm rounded-2xl bg-white p-4 space-y-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Solde Disponible</span>
                  <p className="text-2xl font-extrabold text-slate-900">${budgetStats.remainingBalance.toFixed(2)} <span className="text-xs text-slate-500">CAD</span></p>
                  <p className="text-[10px] text-slate-500 font-medium">Marge budgétaire restante</p>
                </Card>
              </div>

              {/* VENTILATION DU FINANCEMENT DES TÂCHES */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t">
                {/* TÂCHES FINANCIÈRES */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Tâches Financées ({budgetStats.tasksFinanced.length})
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Notes de frais liées</span>
                  </div>

                  {budgetStats.tasksFinanced.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">Aucune tâche n'a encore de dépenses enregistrées.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {budgetStats.tasksFinanced.map((tf: any) => {
                        const taskExpenses = (expenses || []).filter((d: any) => d.tache_id === tf.id);
                        const totalTaskExp = taskExpenses.reduce((acc: number, d: any) => acc + (Number(d.montant) || 0), 0);
                        return (
                          <div key={tf.id} className="p-2.5 bg-emerald-50/50 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs">
                            <div className="min-w-0 flex-1 mr-2">
                              <span className="font-bold text-slate-900 truncate block">{tf.titre}</span>
                              <span className="text-[10px] text-slate-500">{taskExpenses.length} dépense(s) rattachée(s)</span>
                            </div>
                            <span className="font-extrabold text-emerald-900 text-xs shrink-0">${totalTaskExp.toFixed(2)} CAD</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* TÂCHES SANS FINANCEMENT */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" /> Tâches Non Financées ({budgetStats.tasksNotFinanced.length})
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">S'exécutent sans budget</span>
                  </div>

                  {budgetStats.tasksNotFinanced.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">Toutes les tâches de la commission ont des dépenses rattachées.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {budgetStats.tasksNotFinanced.map((tnf: any) => (
                        <div key={tnf.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 truncate">{tnf.titre}</span>
                          <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full shrink-0">
                            {tnf.progression_globale || 0}% exécuté
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tableau / Liste des Dépenses engagées */}
          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Notes de frais & Dépenses visibles ({visibleExpenses.length})
            </h4>

            {visibleExpenses.length === 0 ? (
              <Card className="border border-dashed border-slate-200 rounded-3xl bg-white p-12 text-center space-y-3">
                <DollarSign className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-extrabold text-slate-800 text-sm">Aucune dépense enregistrée ou accessible</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {canSubmitExpense
                    ? "En tant que Lead de tâche ou Responsable, cliquez sur \"Engager une Dépense\" pour soumettre une note de frais."
                    : "Les membres accèdent aux notes de frais associées aux tâches auxquelles ils sont affectés."}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {visibleExpenses.map((dep: any) => {
                  const prof = dep.profiles;
                  const tacheObj = dep.taches;
                  const isPendingComm = dep.statut_commission === 'en_attente_validation';
                  const isModifComm = dep.statut_commission === 'modifications_demandees';
                  const isRejeteComm = dep.statut_commission === 'rejete';

                  let statutLabel =
                    dep.statut === 'paye' ? 'Payé / Remboursé' :
                    dep.statut === 'approuve' ? 'Approuvé Trésorerie' :
                    dep.statut === 'rejete' ? 'Rejeté Trésorerie' :
                    'En attente Trésorerie';

                  let statutClass =
                    dep.statut === 'paye' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' :
                    dep.statut === 'approuve' ? 'bg-blue-100 text-blue-900 border-blue-200' :
                    dep.statut === 'rejete' ? 'bg-red-100 text-red-900 border-red-200' :
                    'bg-slate-100 text-slate-800 border-slate-200';

                  if (isPendingComm) {
                    statutLabel = 'En attente d\'approbation Commission';
                    statutClass = 'bg-amber-100 text-amber-900 border-amber-200';
                  } else if (isModifComm) {
                    statutLabel = 'Modifications demandées par la Commission';
                    statutClass = 'bg-amber-50 text-amber-900 border-amber-300 font-extrabold';
                  } else if (isRejeteComm) {
                    statutLabel = 'Rejeté par la Commission';
                    statutClass = 'bg-red-100 text-red-900 border-red-200';
                  }

                  return (
                    <Card key={dep.id} className="border border-slate-200/80 shadow-sm rounded-2xl bg-white p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${statutClass}`}>
                              {statutLabel}
                            </span>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border">
                              {dep.categorie}
                            </span>
                            <span className="text-xs text-slate-400 font-bold">
                              {new Date(dep.created_at).toLocaleDateString('fr-CA', { dateStyle: 'medium' })}
                            </span>
                          </div>

                          <h5 className="font-extrabold text-slate-900 text-base">{dep.titre}</h5>

                          {dep.description && <p className="text-xs text-slate-600">{dep.description}</p>}

                          {/* Demandeur et Tâche/Objectif liés */}
                          <div className="flex items-center gap-4 text-xs text-slate-500 font-medium pt-1 flex-wrap">
                            {prof && (
                              <span>Demandeur : <strong className="text-slate-800">{prof.prenom} {prof.nom}</strong></span>
                            )}
                            {tacheObj && (
                              <span className="bg-emerald-50 text-emerald-900 font-bold px-2.5 py-0.5 rounded-lg border border-emerald-200 text-[11px]">
                                📋 Tâche : {tacheObj.titre} {tacheObj.objectif ? `(🎯 ${tacheObj.objectif.titre})` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                          <div className="text-right">
                            <span className="text-lg font-extrabold text-slate-900 block">${Number(dep.montant).toFixed(2)} CAD</span>
                          </div>
                          {dep.justificatif_url && (
                            <a
                              href={dep.justificatif_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-xl bg-blue-50 text-blue-950 hover:bg-blue-100 border border-blue-200 transition-colors inline-flex items-center gap-1 text-xs font-bold"
                              title="Voir le justificatif"
                            >
                              <Paperclip className="w-4 h-4" />
                              <span className="hidden sm:inline">Justificatif</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Remarques / Notes de la Commission */}
                      {dep.notes_commission && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                          <span className="font-extrabold block text-[11px] uppercase tracking-wider">Note de la commission :</span>
                          <p className="italic">"{dep.notes_commission}"</p>
                        </div>
                      )}

                      {/* Actions du Responsable / Adjoint de la Commission pour la pré-validation */}
                      {isLeader && isPendingComm && (
                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2 bg-slate-50/50 p-3 rounded-xl">
                          <span className="text-xs font-bold text-slate-600 mr-auto">Arbitrage du Responsable / Adjoint :</span>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => { setDecisionModalData({ depense: dep, decision: 'valide' }); setDecisionNotes(''); }}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-9 rounded-xl px-3"
                          >
                            ✓ Approuver & Transmettre au CA
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => { setDecisionModalData({ depense: dep, decision: 'modifications_demandees' }); setDecisionNotes(''); }}
                            className="border-amber-300 text-amber-900 hover:bg-amber-50 font-bold text-xs h-9 rounded-xl px-3"
                          >
                            ✎ Demander modification
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => { setDecisionModalData({ depense: dep, decision: 'rejete' }); setDecisionNotes(''); }}
                            className="text-red-600 hover:bg-red-50 font-bold text-xs h-9 rounded-xl px-3"
                          >
                            ✕ Rejeter
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL ARBITRAGE DU RESPONSABLE / ADJOINT */}
      {decisionModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl rounded-3xl bg-white border-none overflow-hidden">
            <div className="h-1.5 bg-blue-950" />
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-extrabold text-slate-900">
                  {decisionModalData.decision === 'valide' ? 'Approuver la dépense' : decisionModalData.decision === 'modifications_demandees' ? 'Demander des modifications' : 'Rejeter la dépense'}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Note de frais : &quot;{decisionModalData.depense.titre}&quot; (${Number(decisionModalData.depense.montant).toFixed(2)} CAD)
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setDecisionModalData(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleExecuteDecision} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Remarques / Instructions à destination du demandeur</Label>
                  <Textarea
                    rows={3}
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder={decisionModalData.decision === 'valide' ? 'Commentaire d\'approbation (optionnel)...' : 'Précisez les motifs du rejet ou les ajustements à apporter...'}
                    className="rounded-xl text-xs border-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="ghost" onClick={() => setDecisionModalData(null)} className="rounded-xl text-xs font-bold">
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingDecision}
                    className={`font-extrabold text-xs h-11 rounded-xl px-6 text-white ${
                      decisionModalData.decision === 'valide' ? 'bg-emerald-700 hover:bg-emerald-800' : decisionModalData.decision === 'modifications_demandees' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {isSubmittingDecision ? "Confirmation..." : "Confirmer la décision"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL ENGAGER UNE DÉPENSE / NOTE DE FRAIS */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl shadow-2xl rounded-3xl bg-white border-none overflow-hidden max-h-[90vh] flex flex-col">
            <div className="h-1.5 bg-emerald-600 shrink-0" />
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-extrabold text-slate-900">Engager une Dépense / Note de Frais</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {!isLeader ? "Votre demande sera soumise pour pré-validation au Responsable de commission." : "La dépense sera rattachée à la commission et entrera dans le circuit de validation de la Trésorerie."}
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="p-6 space-y-4 overflow-y-auto">
              <form onSubmit={handleSaveExpense} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Titre de la dépense *</Label>
                  <Input required value={expenseTitre} onChange={(e) => setExpenseTitre(e.target.value)} placeholder="Ex: Impression des dépliants et affiches pour le salon" className="h-11 rounded-xl" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Montant ($ CAD) *</Label>
                    <Input type="number" step="0.01" min="0" required value={expenseMontant} onChange={(e) => setExpenseMontant(e.target.value)} placeholder="Ex: 150.00" className="h-11 rounded-xl font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Catégorie</Label>
                    <select value={expenseCategorie} onChange={(e) => setExpenseCategorie(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 text-xs font-bold px-3">
                      <option value="materiel">Achats & Matériel</option>
                      <option value="impression">Impression & Visuels</option>
                      <option value="restauration">Restauration & Traiteur</option>
                      <option value="transport">Transport & Déplacement</option>
                      <option value="service_web">Abonnement & Service Web</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                </div>

                {/* Liaison optionnelle/recommandée avec les Tâches dont l'utilisateur est Lead (ou toutes pour les responsables) */}
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Tâche & Objectif Associé</Label>
                  <select value={expenseTaskId} onChange={(e) => setExpenseTaskId(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 text-xs font-bold px-3">
                    <option value="">-- Aucune tâche spécifique --</option>
                    {leadTasks.map((tk: any) => (
                      <option key={tk.id} value={tk.id}>
                        📋 {tk.titre} {tk.objectif ? `(🎯 ${tk.objectif.titre})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Description / Remarques</Label>
                  <Textarea rows={2} value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} placeholder="Détails complémentaires sur la facture ou la note de frais..." className="rounded-xl text-xs" />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-700">Pièce Justificative / Reçu (PDF ou Image)</Label>
                  <Input type="file" accept="image/*,application/pdf" onChange={(e) => setExpenseFile(e.target.files?.[0] || null)} className="h-11 rounded-xl border-slate-200 text-xs pt-2" />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="ghost" onClick={() => setShowExpenseModal(false)} className="rounded-xl text-xs font-bold">Annuler</Button>
                  <Button type="submit" disabled={isSubmittingExpense} className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs h-11 rounded-xl px-6">
                    {isSubmittingExpense ? "Transmission..." : "Soumettre la Dépense"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL HISTORIQUE ÉVOLUTION & DOCUMENTS JOINTS */}
      {historyModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl shadow-2xl rounded-3xl bg-white border-none overflow-hidden max-h-[85vh] flex flex-col">
            <div className="h-1.5 bg-blue-950 shrink-0" />
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase bg-blue-100 text-blue-950 px-2.5 py-0.5 rounded-full border border-blue-200">
                    Historique & Documents
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Membre : {historyModalData.member.prenom} {historyModalData.member.nom}
                  </span>
                </div>
                <CardTitle className="text-lg font-extrabold text-slate-900 mt-1">
                  {historyModalData.task.titre}
                </CardTitle>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalData(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </CardHeader>

            <CardContent className="p-6 space-y-6 overflow-y-auto">
              {(() => {
                const memberEvolutions = (historyModalData.task.evolutions || []).filter(
                  (ev: any) => ev.profile_id === historyModalData.member.id || ev.auteur?.id === historyModalData.member.id
                );
                const memberDocs = memberEvolutions.filter((ev: any) => !!ev.file_url);

                return (
                  <div className="space-y-6">
                    {/* Section 1: Documents Joints / Livrables */}
                    {memberDocs.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Paperclip className="w-4 h-4 text-blue-950" />
                          Documents & Livrables joints ({memberDocs.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {memberDocs.map((doc: any) => (
                            <a
                              key={doc.id}
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 rounded-2xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 transition-all flex items-center justify-between gap-3 group"
                            >
                              <div className="min-w-0 flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-950 text-white flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-950">
                                    {doc.file_titre || "Fichier joint"}
                                  </p>
                                  <p className="text-[10px] text-slate-500">
                                    {new Date(doc.created_at).toLocaleDateString('fr-CA', { dateStyle: 'short' })}
                                  </p>
                                </div>
                              </div>
                              <Download className="w-4 h-4 text-blue-950 group-hover:scale-110 transition-transform shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section 2: Historique Chronologique de l'Évolution */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <History className="w-4 h-4 text-blue-950" />
                        Journal des évolutions d'avancement ({memberEvolutions.length})
                      </h4>

                      {memberEvolutions.length === 0 ? (
                        <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center space-y-2 bg-slate-50">
                          <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="text-xs font-bold text-slate-600">Aucun historique d'évolution pour le moment.</p>
                          <p className="text-[11px] text-slate-400">Ce membre n'a pas encore consigné d'avancement ni de livrable sur cette tâche.</p>
                        </div>
                      ) : (
                        <div className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                          {memberEvolutions.map((ev: any) => (
                            <div key={ev.id} className="relative pl-8 space-y-1">
                              <div className={`absolute left-1.5 top-1.5 w-4 h-4 rounded-full border-2 bg-white ${
                                ev.type_evolution === 'cloture' || ev.pourcentage_avancement === 100
                                  ? 'border-emerald-600 bg-emerald-100'
                                  : 'border-blue-950'
                              }`} />
                              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                                      ev.type_evolution === 'cloture' || ev.pourcentage_avancement === 100
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                        : 'bg-blue-100 text-blue-950 border border-blue-200'
                                    }`}>
                                      Avancement : {ev.pourcentage_avancement} %
                                    </span>
                                    {ev.type_evolution === 'cloture' && (
                                      <span className="text-[10px] font-extrabold bg-emerald-700 text-white px-2 py-0.5 rounded-full uppercase">
                                        Clôturé
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    {new Date(ev.created_at).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' })}
                                  </span>
                                </div>

                                {ev.commentaire && (
                                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                                    "{ev.commentaire}"
                                  </p>
                                )}

                                {ev.file_url && (
                                  <div className="pt-1">
                                    <a
                                      href={ev.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-950 hover:underline bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                                    >
                                      <Paperclip className="w-3.5 h-3.5" />
                                      {ev.file_titre || "Consulter le document joint"}
                                      <ExternalLink className="w-3 h-3 ml-1" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
