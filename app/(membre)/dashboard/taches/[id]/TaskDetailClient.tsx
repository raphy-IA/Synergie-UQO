'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  History,
  MessageSquare,
  Percent,
  Send,
  Sparkles,
  Target,
  User,
  Users,
  Building2,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { addTaskEvolution } from '@/app/actions/taches';

interface TaskDetailClientProps {
  task: any;
  currentUserId: string;
}

export default function TaskDetailClient({ task, currentUserId }: TaskDetailClientProps) {
  // Find logged in user's current progress in assignations
  const myAssignation = (task.assignations || []).find((a: any) => a.profile?.id === currentUserId);
  const initialPct = myAssignation ? myAssignation.pourcentage_progression || 0 : 0;

  // Evolution Form State
  const [pourcentage, setPourcentage] = useState<number>(initialPct);
  const [commentaire, setCommentaire] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileTitre, setFileTitre] = useState<string>('');
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isCloture = pourcentage === 100;

  const handleSubmitEvolution = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalFileUrl = fileUrl;
    let finalFileTitre = fileTitre;

    // Direct file upload to Supabase Storage if file selected
    if (fileObj) {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const fileExt = fileObj.name.split('.').pop();
        const cleanFileName = fileObj.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `taches/livrable_${Date.now()}_${cleanFileName}`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(storagePath, fileObj, { cacheControl: '3600', upsert: false });

        if (uploadErr) {
          alert(`Erreur lors de l'envoi du fichier : ${uploadErr.message}`);
          setIsSubmitting(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(storagePath);
        finalFileUrl = publicUrlData?.publicUrl || storagePath;
        if (!finalFileTitre) {
          finalFileTitre = fileObj.name;
        }
      } catch (err: any) {
        alert(`Erreur d'envoi du fichier : ${err.message || err}`);
        setIsSubmitting(false);
        return;
      }
    }

    const res = await addTaskEvolution({
      tacheId: task.id,
      pourcentage,
      commentaire,
      fileUrl: finalFileUrl,
      fileTitre: finalFileTitre,
      isCloture,
    });

    setIsSubmitting(false);

    if (res.success) {
      alert(isCloture ? "Tâche clôturée et livrable enregistré avec succès !" : "Évolution d'avancement enregistrée avec succès !");
      setCommentaire('');
      setFileUrl('');
      setFileTitre('');
      setFileObj(null);
      window.location.reload();
    } else {
      alert(res.error || "Erreur lors de l'enregistrement de l'évolution.");
    }
  };

  const getStatusBadge = (pct: number) => {
    if (pct === 100) return <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs px-3 py-1 rounded-full uppercase">✓ Terminée / Clôturée</span>;
    if (pct > 0) return <span className="bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs px-3 py-1 rounded-full uppercase">⚡ En cours ({pct}%)</span>;
    return <span className="bg-slate-100 text-slate-700 border border-slate-300 font-extrabold text-xs px-3 py-1 rounded-full uppercase">⏳ À faire</span>;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-500 absolute top-0 left-0 right-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <Link
              href="/dashboard/taches"
              className="h-10 w-10 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {task.commission && (
                  <span className="bg-blue-50 text-blue-950 border border-blue-200 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-950" /> Commission : {task.commission.nom}
                  </span>
                )}
                {task.evenement && (
                  <span className="bg-amber-50 text-amber-900 border border-amber-200 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" /> Événement : {task.evenement.titre}
                  </span>
                )}
                {getStatusBadge(task.progression_globale || 0)}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{task.titre}</h1>

              {task.date_echeance && (
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Échéance : {new Date(task.date_echeance).toLocaleDateString('fr-CA', { dateStyle: 'long' })}
                </p>
              )}
            </div>
          </div>

          {/* Aggregate Progress Widget */}
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200/80 flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Progression Globale</span>
              <span className="text-2xl font-extrabold text-blue-950">{task.progression_globale || 0} %</span>
            </div>
            <div className="w-20 bg-slate-200 h-3 rounded-full overflow-hidden">
              <div
                className="bg-blue-950 h-full transition-all"
                style={{ width: `${task.progression_globale || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: DETAILS & EVOLUTION FORM */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Description & Objective */}
          <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 border-b pb-3">Consignes & Objectifs Cibles</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {task.description || "Aucune consigne spécifique rédigée."}
            </p>

            {task.objectif && (
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-emerald-900 tracking-wider flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-emerald-600" /> Objectif Stratégique Rattaché
                </span>
                <h4 className="font-extrabold text-sm text-slate-900">{task.objectif.titre}</h4>
                {task.objectif.description && <p className="text-xs text-slate-600">{task.objectif.description}</p>}

                {task.objectif.missions && task.objectif.missions.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {task.objectif.missions.map((m: any) => (
                      <span key={m.mission?.id} className="text-[10px] bg-white text-slate-800 font-extrabold px-2.5 py-1 rounded-xl border border-emerald-200">
                        Mission #{m.mission?.numero_mission} : {m.mission?.titre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Card 2: Assignees & Team Progress */}
          <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 border-b pb-3">Équipe & Avancement par Membre</h3>
            <div className="space-y-3">
              {(task.assignations || []).map((a: any) => {
                const prof = a.profile;
                if (!prof) return null;
                const isMe = prof.id === currentUserId;

                return (
                  <div key={a.id} className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                    isMe ? 'bg-blue-50/80 border-blue-300' : 'bg-slate-50/80 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-950 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {prof.prenom?.[0]}{prof.nom?.[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-sm">{prof.prenom} {prof.nom}</span>
                          {isMe && <span className="text-[10px] font-extrabold bg-blue-200 text-blue-950 px-2 py-0.5 rounded">Vous</span>}
                          {a.est_responsable_principal && (
                            <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                              ★ Lead
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">{prof.email}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-blue-950 bg-white px-3 py-1 rounded-xl border border-slate-200 block">
                        {a.pourcentage_progression || 0} %
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Card 3: Formulaire d'Évolution & Clôture Moderne */}
          <Card className="border border-slate-200/80 shadow-xl rounded-3xl bg-white p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Enregistrer une Évolution ou Clôturer</h3>
                <p className="text-xs text-slate-500">Faites évoluer le pourcentage (0 à 100%) et déposez un commentaire/livrable.</p>
              </div>
              {getStatusBadge(pourcentage)}
            </div>

            <form onSubmit={handleSubmitEvolution} className="space-y-6">
              {/* Interactive Percentage Slider & Input */}
              <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <Label className="font-extrabold text-xs uppercase tracking-wider text-slate-700">Pourcentage d'avancement *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={pourcentage}
                      onChange={(e) => setPourcentage(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      className="w-20 h-10 text-base font-extrabold text-center rounded-xl border-blue-300 bg-white"
                    />
                    <span className="text-sm font-extrabold text-slate-700">%</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={pourcentage}
                  onChange={(e) => setPourcentage(parseInt(e.target.value))}
                  className="w-full accent-blue-950 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />

                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>0% (À faire)</span>
                  <span>50% (En cours)</span>
                  <span>100% (Terminée / Clôturée)</span>
                </div>
              </div>

              {/* Comment field */}
              <div className="space-y-1.5">
                <Label htmlFor="comm" className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  {isCloture ? "Commentaire de clôture final *" : "Notes ou remarques d'avancement"}
                </Label>
                <Textarea
                  id="comm"
                  rows={3}
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder={isCloture ? "Bilan final de la réalisation de la tâche..." : "Précisez l'avancement réalisé ou les éléments débloqués..."}
                  className="rounded-2xl text-xs border-slate-200"
                />
              </div>

              {/* Deliverable section */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <Label className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-blue-950" />
                  {isCloture ? "Livrable final / Fichier joint (Recommandé)" : "Livrable ou document d'étape (Optionnel)"}
                </Label>

                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <Label htmlFor="fobj" className="text-[11px] font-bold text-slate-700 block">Charger un fichier depuis votre appareil (PDF, Word, Images, etc.)</Label>
                    <Input
                      id="fobj"
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFileObj(file);
                        if (file && !fileTitre) {
                          setFileTitre(file.name);
                        }
                      }}
                      className="h-10 rounded-xl text-xs border-slate-200 bg-white cursor-pointer"
                    />
                    {fileObj && (
                      <p className="text-[10px] text-emerald-700 font-bold">✓ Fichier prêt à être envoyé : {fileObj.name} ({(fileObj.size / 1024).toFixed(1)} KB)</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="ftitle" className="text-[11px] font-bold text-slate-600">Nom / Titre du fichier ou rapport</Label>
                      <Input
                        id="ftitle"
                        value={fileTitre}
                        onChange={(e) => setFileTitre(e.target.value)}
                        placeholder="Ex: Rapport final d'activité"
                        className="h-10 rounded-xl text-xs border-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="furl" className="text-[11px] font-bold text-slate-600">Ou Lien URL externe (Optionnel)</Label>
                      <Input
                        id="furl"
                        value={fileUrl}
                        onChange={(e) => setFileUrl(e.target.value)}
                        placeholder="https://.../mon_livrable.pdf"
                        className="h-10 rounded-xl text-xs border-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className={`w-full font-extrabold h-12 rounded-2xl text-xs shadow-md transition-all ${
                  isCloture
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : 'bg-blue-950 hover:bg-blue-900 text-white'
                }`}
              >
                {isSubmitting
                  ? "Enregistrement..."
                  : isCloture
                  ? "✓ Clôturer la Tâche & Soumettre le Livrable"
                  : "Enregistrer l'Évolution"}
              </Button>
            </form>
          </Card>
        </div>

        {/* RIGHT COLUMN: HISTORIQUE CHRONOLOGIQUE DES ÉVOLUTIONS */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white p-6 space-y-6">
            <div className="flex items-center gap-2 border-b pb-4">
              <History className="w-5 h-5 text-blue-950" />
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Historique des Évolutions</h3>
                <p className="text-[11px] text-slate-500">Journal chronologique des commentaires et livrables.</p>
              </div>
            </div>

            {(!task.evolutions || task.evolutions.length === 0) ? (
              <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Aucune évolution enregistrée dans l'historique pour le moment.
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {task.evolutions.map((ev: any) => {
                  const author = ev.auteur;
                  const isClotureEv = ev.type_evolution === 'cloture' || ev.pourcentage_avancement === 100;

                  return (
                    <div key={ev.id} className="relative pl-10 space-y-2">
                      {/* Timeline dot */}
                      <div className={`absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white ${
                        isClotureEv ? 'border-emerald-600 bg-emerald-600' : 'border-blue-950'
                      }`} />

                      <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            {author ? `${author.prenom} ${author.nom}` : 'Membre'}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isClotureEv ? 'bg-emerald-100 text-emerald-900' : 'bg-blue-100 text-blue-950'
                          }`}>
                            {ev.pourcentage_avancement} %
                          </span>
                        </div>

                        {ev.commentaire && (
                          <p className="text-xs text-slate-700 leading-relaxed font-medium italic bg-white p-2.5 rounded-xl border border-slate-100">
                            « {ev.commentaire} »
                          </p>
                        )}

                        {ev.file_url && (
                          <div className="pt-1">
                            <a
                              href={ev.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-950 hover:underline bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {ev.file_titre || "Télécharger le livrable joint"}
                            </a>
                          </div>
                        )}

                        <span className="text-[10px] text-slate-400 block pt-1">
                          Le {new Date(ev.created_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
