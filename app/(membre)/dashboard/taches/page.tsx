'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2,
  Clock,
  FileText,
  Upload,
  AlertCircle,
  CheckSquare,
  Building2,
  Calendar,
  ArrowRight,
  History,
  Target,
  Sliders,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { getMyGovernedTasks, addTaskEvolution } from '@/app/actions/taches';

export default function MemberTasksPage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Quick Evolution Form State for selected task
  const [pourcentage, setPourcentage] = useState<number>(0);
  const [commentaire, setCommentaire] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileTitre, setFileTitre] = useState<string>('');
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    setLoading(true);
    const governedList = await getMyGovernedTasks();
    setTasks(governedList || []);
    if (governedList && governedList.length > 0 && !selectedTask) {
      handleSelectTask(governedList[0]);
    }
    setLoading(false);
  };

  const handleSelectTask = (task: any) => {
    setSelectedTask(task);
    const myPct = task.ma_progression_individuelle || task.progression_globale || 0;
    setPourcentage(myPct);
  };

  const handleSubmitEvolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setIsSubmitting(true);

    const isCloture = pourcentage === 100;
    let finalFileUrl = fileUrl;
    let finalFileTitre = fileTitre;

    // Direct file upload to Supabase Storage if file selected
    if (fileObj) {
      try {
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
      tacheId: selectedTask.id,
      pourcentage,
      commentaire,
      fileUrl: finalFileUrl,
      fileTitre: finalFileTitre,
      isCloture,
    });

    setIsSubmitting(false);

    if (res.success) {
      alert(isCloture ? "Tâche clôturée et livrable enregistré avec succès !" : "Évolution enregistrée avec succès !");
      setCommentaire('');
      setFileUrl('');
      setFileTitre('');
      setFileObj(null);
      await fetchMyTasks();
    } else {
      alert(res.error || "Erreur lors de l'enregistrement.");
    }
  };

  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'haute':
        return 'bg-red-100 text-red-800 font-extrabold border border-red-200';
      case 'moyenne':
        return 'bg-amber-100 text-amber-900 font-extrabold border border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 font-bold border border-slate-200';
    }
  };

  const getStatusBadge = (pct: number) => {
    if (pct === 100) return <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase">✓ Terminée</span>;
    if (pct > 0) return <span className="bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase">⚡ En cours ({pct}%)</span>;
    return <span className="bg-slate-100 text-slate-700 border border-slate-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase">⏳ À faire</span>;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-500 absolute top-0 left-0 right-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 text-blue-950 rounded-2xl">
                <CheckSquare className="w-6 h-6 text-blue-950" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Mes Tâches & Affectations</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Suivez vos tâches, faites évoluer votre pourcentage d'avancement et déposez vos livrables ou rapports finaux.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* TASK LIST (LEFT COLUMN) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-950" /> Tâches en cours & à faire
              </CardTitle>
              <span className="text-xs bg-blue-100 text-blue-950 px-3 py-1 rounded-full font-bold">
                {tasks.length} Tâche(s)
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <p className="text-center py-10 text-slate-400 text-xs italic">Chargement de vos tâches...</p>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12 px-6 space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                  <p className="font-extrabold text-slate-800 text-sm">Vous n&apos;avez aucune tâche assignée pour le moment !</p>
                  <p className="text-xs text-slate-400">Les tâches associées à vos commissions ou affectations s&apos;afficheront ici.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tasks.map((task) => {
                    const isSelected = selectedTask?.id === task.id;
                    const pct = task.progression_globale || 0;

                    return (
                      <div
                        key={task.id}
                        onClick={() => handleSelectTask(task)}
                        className={`p-5 space-y-3 cursor-pointer transition-all ${
                          isSelected ? 'bg-blue-50/60 border-l-4 border-blue-950' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Context / Commission Badge */}
                              {task.commissions ? (
                                <span className="bg-blue-50 text-blue-950 border border-blue-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-blue-950" /> Commission : {task.commissions.nom}
                                </span>
                              ) : task.evenements ? (
                                <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-amber-600" /> Événement : {task.evenements.titre}
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                                  🏢 {task.contexte || 'Général'}
                                </span>
                              )}

                              {getStatusBadge(pct)}
                              <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${getPriorityBadge(task.priorite)}`}>
                                {task.priorite}
                              </span>
                            </div>

                            <h3 className="font-extrabold text-slate-900 text-base leading-snug">{task.titre}</h3>
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{task.description || 'Aucune description fournie.'}</p>
                          </div>

                          {/* Action Button & Link to Detailed Page */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <Link href={`/dashboard/taches/${task.id}`}>
                              <Button size="sm" className="bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-xs h-9 px-4 rounded-xl shadow-sm gap-1">
                                Gérer & Faire évoluer <ArrowRight className="w-3.5 h-3.5" />
                              </Button>
                            </Link>

                            {task.date_echeance && (
                              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(task.date_echeance).toLocaleDateString('fr-CA', { dateStyle: 'short' })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                          <span>Avancement global : <strong className="text-slate-900">{pct} %</strong></span>
                          <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-950 h-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* QUICK EVOLUTION & REPORTING PANEL (RIGHT COLUMN) */}
        <div className="lg:col-span-5">
          {selectedTask ? (
            <Card className="border border-slate-200/80 shadow-xl rounded-3xl bg-white p-6 space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Évolution Rapide de la Tâche</h3>
                  <p className="text-[11px] text-slate-500">Sélectionnée : <strong className="text-slate-900">{selectedTask.titre}</strong></p>
                </div>
                <Link href={`/dashboard/taches/${selectedTask.id}`}>
                  <Button variant="outline" size="sm" className="text-xs font-bold rounded-xl h-8 px-3 text-blue-950">
                    Détail complet <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>

              <form onSubmit={handleSubmitEvolution} className="space-y-5">
                {/* Interactive Slider */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <Label className="font-extrabold text-xs uppercase tracking-wider text-slate-700">Pourcentage d'avancement *</Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={pourcentage}
                        onChange={(e) => setPourcentage(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                        className="w-16 h-9 text-sm font-extrabold text-center rounded-xl border-blue-300 bg-white"
                      />
                      <span className="text-xs font-extrabold text-slate-700">%</span>
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

                  <div className="flex justify-between text-[9px] font-bold text-slate-400">
                    <span>0% (À faire)</span>
                    <span>50% (En cours)</span>
                    <span>100% (Terminée)</span>
                  </div>
                </div>

                {/* Comment field */}
                <div className="space-y-1">
                  <Label htmlFor="quickComm" className="text-xs font-bold text-slate-700">
                    {pourcentage === 100 ? "Commentaire de clôture final *" : "Notes / Remarques d'avancement"}
                  </Label>
                  <Textarea
                    id="quickComm"
                    rows={2}
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                    placeholder={pourcentage === 100 ? "Description du bilan et des réalisations..." : "Précisez l'étape franchie..."}
                    className="rounded-xl text-xs border-slate-200"
                  />
                </div>

                {/* Deliverable section */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5 text-blue-950" />
                    {pourcentage === 100 ? "Livrable final / Fichier joint (Recommandé)" : "Livrable ou document d'étape (Optionnel)"}
                  </Label>
                  <div className="space-y-2">
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <Label htmlFor="quickFobj" className="text-[10px] font-bold text-slate-700 block">Joindre un fichier (PDF, Word, Images...)</Label>
                      <Input
                        id="quickFobj"
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setFileObj(file);
                          if (file && !fileTitre) {
                            setFileTitre(file.name);
                          }
                        }}
                        className="h-8 rounded-lg text-xs border-slate-200 bg-white cursor-pointer"
                      />
                      {fileObj && (
                        <p className="text-[9px] text-emerald-700 font-bold">✓ Fichier sélectionné : {fileObj.name}</p>
                      )}
                    </div>
                    <Input
                      placeholder="Nom du livrable (Ex: Rapport final)"
                      value={fileTitre}
                      onChange={(e) => setFileTitre(e.target.value)}
                      className="h-9 rounded-xl text-xs border-slate-200"
                    />
                    <Input
                      placeholder="Ou Lien URL externe (https://...)"
                      value={fileUrl}
                      onChange={(e) => setFileUrl(e.target.value)}
                      className="h-9 rounded-xl text-xs border-slate-200"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full font-extrabold h-11 rounded-xl text-xs shadow-md transition-all ${
                    pourcentage === 100
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      : 'bg-blue-950 hover:bg-blue-900 text-white'
                  }`}
                >
                  {isSubmitting
                    ? "Enregistrement..."
                    : pourcentage === 100
                    ? "✓ Clôturer la Tâche & Soumettre Livrable"
                    : "Enregistrer l'Évolution"}
                </Button>
              </form>
            </Card>
          ) : (
            <div className="p-8 bg-slate-50 border border-slate-200/80 rounded-3xl text-center space-y-2 text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-xs font-bold text-slate-700">Sélectionnez une tâche à gauche</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Cliquez sur une tâche pour afficher ses options d'avancement et faire évoluer votre pourcentage.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
