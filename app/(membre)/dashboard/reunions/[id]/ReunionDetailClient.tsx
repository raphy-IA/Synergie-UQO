'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Video,
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Send,
  Download,
  CheckSquare,
  Sparkles,
  Check,
  UserCheck,
  AlertCircle,
  Pencil
} from 'lucide-react';
import Link from 'next/link';
import {
  updateReunion,
  updateMemberRSVP,
  updateEmargement,
  saveReunionODJ,
  saveReunionPV,
  publishReunion,
  deleteReunion,
  updateReunionDetails
} from '@/app/actions/reunions';
import { createTaskWithGovernance } from '@/app/actions/taches';
import { formatDateOttawa, formatTimeOttawa, toDatetimeLocalOttawa, parseOttawaDatetimeToISO } from '@/lib/date-utils';

interface ReunionDetailClientProps {
  reunion: any;
  currentUserId: string;
  allProfiles: any[];
}

export default function ReunionDetailClient({ reunion, currentUserId, allProfiles }: ReunionDetailClientProps) {
  const [activeTab, setActiveTab] = useState<'apercu' | 'odj' | 'emargement' | 'pv'>('apercu');

  // RSVP state
  const myPresence = (reunion.presences || []).find((p: any) => p.profile_id === currentUserId);
  const [myStatut, setMyStatut] = useState<string>(myPresence?.statut || 'convoque');

  // ODJ State
  const [odjItems, setOdjItems] = useState<any[]>(reunion.odj || []);
  const [isSavingODJ, setIsSavingODJ] = useState(false);

  // Emargement State
  const [presencesMap, setPresencesMap] = useState<Record<string, { statut: string; motif?: string }>>(() => {
    const map: Record<string, { statut: string; motif?: string }> = {};
    (reunion.presences || []).forEach((p: any) => {
      map[p.profile_id] = { statut: p.statut, motif: p.motif_absence };
    });
    return map;
  });
  const [isSavingEmargement, setIsSavingEmargement] = useState(false);

  // PV State
  const [compteRendu, setCompteRendu] = useState<string>(reunion.pv?.compte_rendu || '');
  const [documentUrl, setDocumentUrl] = useState<string>(reunion.pv?.document_url || '');
  const [valideParBureau, setValideParBureau] = useState<boolean>(reunion.pv?.valide_par_bureau || false);
  const [isSavingPV, setIsSavingPV] = useState(false);

  // Task Creation from PV Decision State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    titre: '',
    description: '',
    date_echeance: '',
    priorite: 'moyenne',
    assignes: [] as string[],
  });

  const currentUserRole = allProfiles.find((p: any) => p.id === currentUserId)?.role;
  const isCreatorOrSuperadmin = reunion.organisateur_id === currentUserId || currentUserRole === 'superadmin';

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    titre: reunion.titre || '',
    type_reunion: reunion.type_reunion || 'bureau',
    format_reunion: reunion.format_reunion || 'presentiel',
    lieu: reunion.lieu || '',
    lien_visio: reunion.lien_visio || '',
    date_debut: toDatetimeLocalOttawa(reunion.date_debut),
    date_fin: toDatetimeLocalOttawa(reunion.date_fin),
    description: reunion.description || '',
    commission_id: reunion.commission_id || '',
    convoques_ids: (reunion.presences || []).map((p: any) => p.profile_id),
    odj_text: (reunion.odj || []).map((o: any) => o.titre).join('\n'),
  });

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.titre || !editForm.date_debut) {
      alert('Veuillez renseigner au moins le titre et la date de début.');
      return;
    }
    setIsSubmittingEdit(true);

    const isoStart = parseOttawaDatetimeToISO(editForm.date_debut);
    const isoEnd = editForm.date_fin ? parseOttawaDatetimeToISO(editForm.date_fin) : undefined;

    const odjItems = editForm.odj_text
      .split('\n')
      .filter((line: string) => line.trim().length > 0)
      .map((line: string) => ({ titre: line.trim(), duree_minutes: 15 }));

    const res = await updateReunionDetails(reunion.id, {
      titre: editForm.titre,
      type_reunion: editForm.type_reunion,
      format_reunion: editForm.format_reunion,
      lieu: editForm.lieu,
      lien_visio: editForm.lien_visio,
      date_debut: isoStart,
      date_fin: isoEnd,
      description: editForm.description,
      commission_id: editForm.commission_id || undefined,
      convoques_ids: editForm.convoques_ids,
      odj_items: odjItems,
    });

    setIsSubmittingEdit(false);
    if (res.success) {
      alert('Réunion modifiée avec succès !');
      setIsEditOpen(false);
      window.location.reload();
    } else {
      alert(res.error || 'Erreur lors de la modification.');
    }
  };

  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePublishReunion = async () => {
    if (!confirm('Voulez-vous publier cette réunion et convoquer les membres ? Un e-mail et une notification leur seront envoyés.')) {
      return;
    }
    setIsPublishing(true);
    const res = await publishReunion(reunion.id);
    setIsPublishing(false);
    if (res.success) {
      alert('Réunion publiée avec succès ! Les membres ont été convoqués.');
      window.location.reload();
    } else {
      alert(res.error || 'Erreur lors de la publication.');
    }
  };

  const handleDeleteReunion = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette réunion ? Cette action est irréversible.')) {
      return;
    }
    setIsDeleting(true);
    const res = await deleteReunion(reunion.id);
    setIsDeleting(false);
    if (res.success) {
      alert('Réunion supprimée avec succès.');
      window.location.href = '/dashboard/reunions';
    } else {
      alert(res.error || 'Erreur lors de la suppression.');
    }
  };

  const handleRSVPChange = async (statut: 'present' | 'excuse' | 'absent') => {
    let motif = '';
    if (statut === 'excuse') {
      motif = prompt('Motif d\'absence excusée :') || '';
    }
    setMyStatut(statut);
    const res = await updateMemberRSVP({ reunionId: reunion.id, statut, motifAbsence: motif });
    if (res.success) {
      window.location.reload();
    }
  };

  const handleAddODJItem = () => {
    setOdjItems([...odjItems, { id: `new_${Date.now()}`, titre: '', description: '', duree_minutes: 15 }]);
  };

  const handleSaveODJ = async () => {
    setIsSavingODJ(true);
    const res = await saveReunionODJ(reunion.id, odjItems);
    setIsSavingODJ(false);
    if (res.success) {
      alert('Ordre du Jour mis à jour avec succès !');
      window.location.reload();
    } else {
      alert(res.error || 'Erreur lors de la sauvegarde de l\'ODJ.');
    }
  };

  const handleSaveEmargement = async () => {
    setIsSavingEmargement(true);
    const list = Object.entries(presencesMap).map(([profile_id, data]) => ({
      profile_id,
      statut: data.statut,
      motif_absence: data.motif,
    }));
    const res = await updateEmargement(reunion.id, list);
    setIsSavingEmargement(false);
    if (res.success) {
      alert('Émargement enregistré avec succès !');
      window.location.reload();
    } else {
      alert(res.error || 'Erreur d\'émargement.');
    }
  };

  const handleSavePV = async (validate: boolean = false) => {
    if (!compteRendu.trim()) {
      alert('Veuillez rédiger le compte-rendu du procès-verbal.');
      return;
    }
    setIsSavingPV(true);
    const res = await saveReunionPV({
      reunionId: reunion.id,
      compteRendu,
      documentUrl,
      valideParBureau: validate || valideParBureau,
    });
    setIsSavingPV(false);
    if (res.success) {
      alert(validate ? 'Procès-verbal validé par le Bureau & Séance clôturée !' : 'Brouillon de PV enregistré.');
      window.location.reload();
    } else {
      alert(res.error || 'Erreur de sauvegarde du PV.');
    }
  };

  const handleCreateTaskFromDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.titre) return;

    const assignesPayload = taskForm.assignes.map((pid, idx) => ({
      profile_id: pid,
      est_responsable_principal: idx === 0,
    }));

    const res = await createTaskWithGovernance({
      titre: taskForm.titre,
      description: taskForm.description,
      contexte: 'bureau',
      cibleType: taskForm.assignes.length > 0 ? 'membre' : 'bureau',
      reunion_id: reunion.id,
      dateEcheance: taskForm.date_echeance || undefined,
      priorite: taskForm.priorite as any,
      assignesMultiples: assignesPayload,
    });

    if (res.success) {
      alert('Tâche découlant de la réunion créée avec succès !');
      setIsTaskModalOpen(false);
      setTaskForm({ titre: '', description: '', date_echeance: '', priorite: 'moyenne', assignes: [] });
      window.location.reload();
    } else {
      alert(res.error || 'Erreur de création de la tâche.');
    }
  };

  const startDate = new Date(reunion.date_debut);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-500 absolute top-0 left-0 right-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <Link
              href="/dashboard/reunions"
              className="h-10 w-10 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-indigo-100 text-indigo-900 border border-indigo-300 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase">
                  {reunion.type_reunion.replace('_', ' ')}
                </span>
                <span className={`font-extrabold text-[10px] px-3 py-1 rounded-full uppercase ${
                  reunion.statut === 'terminee'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : reunion.statut === 'brouillon'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-blue-50 text-blue-950 border border-blue-200'
                }`}>
                  {reunion.statut === 'terminee' ? '✓ Clôturée' : reunion.statut === 'brouillon' ? '📝 Brouillon' : '📅 Convoquée'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{reunion.titre}</h1>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-950" />
                  {formatDateOttawa(reunion.date_debut, { dateStyle: 'long' })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {formatTimeOttawa(reunion.date_debut)} (Ottawa / Québec)
                </span>
                {reunion.format_reunion === 'presentiel' ? (
                  <span className="flex items-center gap-1.5 text-emerald-900 font-bold">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    {reunion.lieu || 'Présentiel'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-blue-950 font-bold">
                    <Video className="w-4 h-4 text-blue-950" />
                    {reunion.lien_visio ? <a href={reunion.lien_visio} target="_blank" rel="noreferrer" className="underline">Lien Visio Direct</a> : 'Visio'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick RSVP & Actions Widget */}
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 shrink-0 space-y-2 text-right">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Votre Présence / Actions</span>
            <div className="flex items-center gap-2 justify-end flex-wrap">
              {isCreatorOrSuperadmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditOpen(true)}
                  className="h-8 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-100 rounded-xl"
                  title="Modifier la réunion"
                >
                  <Pencil className="w-3.5 h-3.5" /> Éditer
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => handleRSVPChange('present')}
                className={`h-8 text-xs font-bold rounded-xl ${
                  myStatut === 'present' ? 'bg-emerald-700 text-white' : 'bg-white border text-slate-700 hover:bg-slate-50'
                }`}
              >
                ✓ Présent(e)
              </Button>
              <Button
                size="sm"
                onClick={() => handleRSVPChange('excuse')}
                className={`h-8 text-xs font-bold rounded-xl ${
                  myStatut === 'excuse' ? 'bg-amber-700 text-white' : 'bg-white border text-slate-700 hover:bg-slate-50'
                }`}
              >
                ✉️ Excusé(e)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeleteReunion}
                disabled={isDeleting}
                className="h-8 text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
                title="Supprimer la réunion"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Draft Warning Banner */}
      {reunion.statut === 'brouillon' && (
        <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-900 rounded-2xl shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-amber-950 text-sm">Réunion en mode Brouillon</h4>
              <p className="text-xs text-amber-800 font-medium">
                Cette réunion n'a pas encore été publiée. Les membres convoqués n'ont reçu aucune notification ni aucun e-mail.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            {isCreatorOrSuperadmin && (
              <Button
                variant="outline"
                onClick={() => setIsEditOpen(true)}
                className="text-amber-950 border-amber-300 hover:bg-white font-extrabold text-xs h-10 px-4 rounded-2xl"
              >
                <Pencil className="w-4 h-4 mr-1" /> Modifier
              </Button>
            )}
            <Button
              onClick={handlePublishReunion}
              disabled={isPublishing}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs h-10 px-5 rounded-2xl shadow-md w-full sm:w-auto"
            >
              {isPublishing ? 'Publication en cours...' : 'Publier & Convoquer les membres'}
            </Button>
          </div>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('apercu')}
          className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'apercu'
              ? 'border-blue-950 text-blue-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Video className="w-4 h-4" /> 1. Aperçu & Convocation
        </button>
        <button
          onClick={() => setActiveTab('odj')}
          className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'odj'
              ? 'border-blue-950 text-blue-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" /> 2. Ordre du Jour ({odjItems.length})
        </button>
        <button
          onClick={() => setActiveTab('emargement')}
          className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'emargement'
              ? 'border-blue-950 text-blue-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" /> 3. Émargement & Présences ({(reunion.presences || []).length})
        </button>
        <button
          onClick={() => setActiveTab('pv')}
          className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'pv'
              ? 'border-blue-950 text-blue-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" /> 4. Procès-Verbal & Décisions
        </button>
      </div>

      {/* TAB 1: APERÇU */}
      {activeTab === 'apercu' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 border-b pb-3">Détails & Contexte de la Séance</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {reunion.description || "Aucune description de contexte rédigée."}
              </p>

              {reunion.lien_visio && (
                <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-blue-950 tracking-wider block">Lien Visioconférence Direct</span>
                    <a href={reunion.lien_visio} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-950 underline hover:text-blue-900">
                      {reunion.lien_visio}
                    </a>
                  </div>
                  <a href={reunion.lien_visio} target="_blank" rel="noreferrer">
                    <Button size="sm" className="bg-blue-950 text-white font-extrabold text-xs h-9 px-4 rounded-xl">
                      Rejoindre Visio
                    </Button>
                  </a>
                </div>
              )}
            </Card>

            {/* Attached Tasks from this Meeting */}
            <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blue-950" /> Tâches découlant de la séance ({(reunion.taches || []).length})
                </h3>
                <Button size="sm" onClick={() => setIsTaskModalOpen(true)} className="bg-blue-950 text-white font-bold text-xs h-8 px-3 rounded-xl gap-1">
                  <Plus className="w-3.5 h-3.5" /> Créer une tâche
                </Button>
              </div>

              {(!reunion.taches || reunion.taches.length === 0) ? (
                <p className="text-xs text-slate-400 italic text-center py-6">Aucune tâche enregistrée suite aux décisions de cette réunion.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {reunion.taches.map((t: any) => (
                    <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{t.titre}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{t.description}</p>
                      </div>
                      <span className="text-[10px] font-extrabold bg-blue-100 text-blue-950 px-2.5 py-1 rounded-full">
                        {t.progression_globale || 0} %
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 border-b pb-3">Organisateur & Support</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-950 text-white font-bold text-xs flex items-center justify-center">
                  {reunion.organisateur?.prenom?.[0]}{reunion.organisateur?.nom?.[0]}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{reunion.organisateur?.prenom} {reunion.organisateur?.nom}</h4>
                  <span className="text-[10px] text-slate-400 block">{reunion.organisateur?.email}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: ORDRE DU JOUR (ODJ) */}
      {activeTab === 'odj' && (
        <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Ordre du Jour Chronométré</h3>
              <p className="text-xs text-slate-500">Structurez le déroulé et la durée allouée pour chaque point de discussion.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddODJItem} variant="outline" size="sm" className="text-xs font-bold rounded-xl h-9">
                + Ajouter un point
              </Button>
              <Button onClick={handleSaveODJ} disabled={isSavingODJ} className="bg-blue-950 hover:bg-blue-900 text-white text-xs font-bold rounded-xl h-9 px-4">
                {isSavingODJ ? 'Enregistrement...' : 'Sauvegarder l\'ODJ'}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {odjItems.map((item, idx) => (
              <div key={item.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-extrabold text-blue-950 bg-blue-100 px-3 py-1 rounded-xl">
                    Point #{idx + 1}
                  </span>
                  <button
                    onClick={() => setOdjItems(odjItems.filter((_, i) => i !== idx))}
                    className="text-red-500 hover:text-red-700 text-xs font-bold"
                  >
                    Supprimer
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8 space-y-1">
                    <Label className="text-[11px] font-bold text-slate-600">Sujet / Titre du point</Label>
                    <Input
                      value={item.titre}
                      onChange={(e) => {
                        const copy = [...odjItems];
                        copy[idx].titre = e.target.value;
                        setOdjItems(copy);
                      }}
                      placeholder="Ex: Examen du budget prévisionnel"
                      className="h-9 text-xs rounded-xl border-slate-200 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-4 space-y-1">
                    <Label className="text-[11px] font-bold text-slate-600">Durée (minutes)</Label>
                    <Input
                      type="number"
                      value={item.duree_minutes || 15}
                      onChange={(e) => {
                        const copy = [...odjItems];
                        copy[idx].duree_minutes = parseInt(e.target.value) || 15;
                        setOdjItems(copy);
                      }}
                      className="h-9 text-xs rounded-xl border-slate-200 bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 3: ÉMARGEMENT & PRÉSENCES */}
      {activeTab === 'emargement' && (
        <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Émargement Officiel des Convoqués</h3>
              <p className="text-xs text-slate-500">Validez les présences réelles ou saisissez les motifs d'absences excusées.</p>
            </div>
            <Button onClick={handleSaveEmargement} disabled={isSavingEmargement} className="bg-blue-950 text-white text-xs font-extrabold rounded-xl h-9 px-4">
              {isSavingEmargement ? 'Enregistrement...' : 'Enregistrer l\'Émargement'}
            </Button>
          </div>

          <div className="divide-y divide-slate-100">
            {(reunion.presences || []).map((p: any) => {
              const prof = p.profile;
              if (!prof) return null;

              const currentData = presencesMap[prof.id] || { statut: p.statut, motif: p.motif_absence };

              return (
                <div key={p.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-950 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {prof.prenom?.[0]}{prof.nom?.[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{prof.prenom} {prof.nom}</h4>
                      <span className="text-[10px] text-slate-400">{prof.email} • Role: {prof.role}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={currentData.statut}
                      onChange={(e) => {
                        setPresencesMap({
                          ...presencesMap,
                          [prof.id]: { ...currentData, statut: e.target.value }
                        });
                      }}
                      className="h-9 text-xs rounded-xl border border-slate-200 font-bold bg-slate-50 px-3"
                    >
                      <option value="convoque"> Convoqué(e)</option>
                      <option value="present">✓ Présent(e)</option>
                      <option value="excuse">✉️ Excusé(e)</option>
                      <option value="absent">❌ Absent(e)</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* TAB 4: PROCÈS-VERBAL & DÉCISIONS */}
      {activeTab === 'pv' && (
        <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Procès-Verbal Officiel de la Séance</h3>
              <p className="text-xs text-slate-500">Rédigez les résolutions et le compte-rendu validé par le Bureau.</p>
            </div>
            {valideParBureau && (
              <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs px-3 py-1 rounded-full">
                ✓ Validé par le Bureau Exécutif
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pvtext" className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Compte-rendu des Débats & Résolutions Adoptées *
              </Label>
              <Textarea
                id="pvtext"
                rows={10}
                value={compteRendu}
                onChange={(e) => setCompteRendu(e.target.value)}
                placeholder="Rédigez ici le compte-rendu officiel de la séance, les points votés et les décisions prises..."
                className="rounded-2xl text-xs border-slate-200 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pvurl" className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Lien du document PDF officiel du PV signé (Optionnel)
              </Label>
              <Input
                id="pvurl"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="https://.../PV_Seance_04.pdf"
                className="h-10 rounded-xl text-xs border-slate-200"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
              <Button
                onClick={() => handleSavePV(false)}
                disabled={isSavingPV}
                variant="outline"
                className="rounded-2xl text-xs font-bold h-11"
              >
                Enregistrer Brouillon
              </Button>

              <Button
                onClick={() => handleSavePV(true)}
                disabled={isSavingPV}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs h-11 px-6 rounded-2xl shadow-md"
              >
                ✓ Valider le PV & Clôturer la Séance
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* CREATE TASK FROM MEETING MODAL */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Nouvelle Tâche issue de la Séance</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateTaskFromDecision} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Intitulé de la tâche *</Label>
                <Input
                  required
                  placeholder="Ex: Rédiger le rapport de partenariat"
                  value={taskForm.titre}
                  onChange={(e) => setTaskForm({ ...taskForm, titre: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Consignes & Détails</Label>
                <Textarea
                  rows={2}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Membres Assignés</Label>
                <select
                  multiple
                  value={taskForm.assignes}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                    setTaskForm({ ...taskForm, assignes: selected });
                  }}
                  className="w-full h-24 text-xs rounded-xl border border-slate-200 p-2 font-medium bg-white"
                >
                  {allProfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.prenom} {p.nom} ({p.role})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setIsTaskModalOpen(false)} className="rounded-xl text-xs">
                  Annuler
                </Button>
                <Button type="submit" className="bg-blue-950 text-white font-bold text-xs rounded-xl px-4">
                  Créer la Tâche
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT REUNION MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <Card className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Modifier la Réunion</h2>
                <p className="text-xs text-slate-500">Mettez à jour les informations, la date, l'ordre du jour ou les membres convoqués.</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="edtitre" className="text-xs font-extrabold text-slate-700">Titre de la Réunion *</Label>
                <Input
                  id="edtitre"
                  required
                  value={editForm.titre}
                  onChange={(e) => setEditForm({ ...editForm, titre: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-700">Type de Réunion *</Label>
                  <select
                    value={editForm.type_reunion}
                    onChange={(e) => setEditForm({ ...editForm, type_reunion: e.target.value })}
                    className="w-full h-9 text-xs rounded-xl border border-slate-200 px-3 font-medium bg-white"
                  >
                    <option value="bureau">👑 Réunion du Bureau Exécutif</option>
                    <option value="reunion_ca">🏛️ Réunion du Conseil d'Administration (CA)</option>
                    <option value="inter_commissions">🤝 Réunion Inter-Commissions</option>
                    <option value="president_commissions">⭐ Président & Responsables de Commissions</option>
                    <option value="commission">👥 Séance de Commission</option>
                    <option value="extraordinaire">💼 Réunion Extraordinaire / Projet</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-700">Format *</Label>
                  <select
                    value={editForm.format_reunion}
                    onChange={(e) => setEditForm({ ...editForm, format_reunion: e.target.value })}
                    className="w-full h-9 text-xs rounded-xl border border-slate-200 px-3 font-medium bg-white"
                  >
                    <option value="presentiel">🏢 Présentiel</option>
                    <option value="visio">💻 Visioconférence (Google Meet / Zoom)</option>
                    <option value="hybride">🌐 Hybride</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-700">Date & Heure de début *</Label>
                  <Input
                    type="datetime-local"
                    required
                    value={editForm.date_debut}
                    onChange={(e) => setEditForm({ ...editForm, date_debut: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-700">Date & Heure de fin</Label>
                  <Input
                    type="datetime-local"
                    value={editForm.date_fin}
                    onChange={(e) => setEditForm({ ...editForm, date_fin: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-700">Lieu (si présentiel/hybride)</Label>
                  <Input
                    placeholder="Ex: Salle des conseils UQO / Local 201"
                    value={editForm.lieu}
                    onChange={(e) => setEditForm({ ...editForm, lieu: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-700">Lien Visio (si visio/hybride)</Label>
                  <Input
                    placeholder="https://meet.google.com/xyz-abc-def"
                    value={editForm.lien_visio}
                    onChange={(e) => setEditForm({ ...editForm, lien_visio: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-extrabold text-slate-700">Description / Objets de la séance</Label>
                <Textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-extrabold text-slate-700">Membres Convoqués</Label>
                <select
                  multiple
                  value={editForm.convoques_ids}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                    setEditForm({ ...editForm, convoques_ids: selected });
                  }}
                  className="w-full h-32 text-xs rounded-xl border border-slate-200 p-2 font-medium bg-white"
                >
                  {allProfiles.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.prenom} {m.nom} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-extrabold text-slate-700">Ordre du Jour (Une ligne par point)</Label>
                <Textarea
                  rows={3}
                  value={editForm.odj_text}
                  onChange={(e) => setEditForm({ ...editForm, odj_text: e.target.value })}
                  className="rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl text-xs">
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmittingEdit} className="bg-blue-950 text-white font-extrabold text-xs rounded-xl px-5">
                  {isSubmittingEdit ? 'Enregistrement...' : 'Enregistrer les Modifications'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
