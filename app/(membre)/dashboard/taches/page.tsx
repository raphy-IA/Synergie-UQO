'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Clock, FileText, Upload, AlertCircle, CheckSquare, Layers, Sparkles, ExternalLink } from 'lucide-react';

interface Tache {
  id: string;
  titre: string;
  description: string;
  statut: string;
  priorite: string;
  contexte: string;
  date_echeance: string | null;
  commission_id: string | null;
  evenement_id: string | null;
  commissions?: {
    nom: string;
  } | null;
  evenements?: {
    titre: string;
  } | null;
}

interface Document {
  id: string;
  titre: string;
  description: string;
  file_url: string;
}

import { getMyGovernedTasks } from '@/app/actions/taches';

export default function MemberTasksPage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Tache[]>([]);
  const [selectedTask, setSelectedTask] = useState<Tache | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // Deliverable Upload Form State
  const [docTitre, setDocTitre] = useState('');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [docDesc, setDocDesc] = useState('');

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    setLoading(true);
    const governedList = await getMyGovernedTasks();
    setTasks(governedList as any);
    setLoading(false);
  };

  const updateTaskStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('taches')
      .update({ statut: newStatus })
      .eq('id', id);

    if (!error) {
      fetchMyTasks();
      if (selectedTask && selectedTask.id === id) {
        setSelectedTask(prev => prev ? { ...prev, statut: newStatus } : null);
      }
    }
  };

  const loadDeliverables = async (tacheId: string) => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('tache_id', tacheId);

    if (data) {
      setDocuments(data);
    }
  };

  const handleUploadDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !docTitre || !docFileUrl) return;

    const { error } = await supabase
      .from('documents')
      .insert({
        titre: docTitre,
        description: docDesc || null,
        file_url: docFileUrl,
        categorie: 'autre',
        est_public: false,
        tache_id: selectedTask.id,
        commission_id: selectedTask.commission_id
      });

    if (!error) {
      alert("Livrable ou rapport de tâche attaché avec succès !");
      setDocTitre('');
      setDocDesc('');
      setDocFileUrl('');
      loadDeliverables(selectedTask.id);
    } else {
      console.error(error);
      alert("Erreur lors de l'attachement du document.");
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-blue-950">Mes Tâches Assignées</h1>
        <p className="text-sm text-slate-500">Suivez et soumettez vos livrables ou rapports pour les commissions et événements.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Task List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-900" /> Tâches en cours & à faire
              </CardTitle>
              <span className="text-xs bg-blue-100 text-blue-900 px-3 py-1 rounded-full font-bold">
                {tasks.length} Tâche(s)
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <p className="text-center py-10 text-slate-400">Chargement de vos tâches...</p>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12 px-6 space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                  <p className="font-extrabold text-slate-800">Vous n&apos;avez aucune tâche assignée pour le moment !</p>
                  <p className="text-xs text-slate-400">Les tâches associées à vos commissions ou affectations s&apos;afficheront ici.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tasks.map((task) => {
                    const isSelected = selectedTask?.id === task.id;
                    return (
                      <div
                        key={task.id}
                        onClick={() => { setSelectedTask(task); loadDeliverables(task.id); }}
                        className={`p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 cursor-pointer transition-all ${
                          isSelected ? 'bg-blue-50/50 border-l-4 border-blue-900' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-base">{task.titre}</span>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{task.description || 'Aucune description fournie.'}</p>
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-semibold text-slate-500">
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold border border-slate-200">
                              {task.contexte}
                              {task.contexte === 'commission' && task.commissions ? ` : ${task.commissions.nom}` : ''}
                              {task.contexte === 'ag' && task.evenements ? ` : ${task.evenements.titre}` : ''}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              Échéance : {task.date_echeance ? new Date(task.date_echeance).toLocaleDateString('fr-CA', { dateStyle: 'medium' }) : 'Aucune'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full ${getPriorityBadge(task.priorite)}`}>
                            {task.priorite}
                          </span>
                          <select
                            value={task.statut}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                            className="text-xs font-bold p-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-900 shadow-sm"
                          >
                            <option value="a_faire">À faire</option>
                            <option value="en_cours">En cours</option>
                            <option value="termine">Terminé</option>
                            <option value="annule">Annulé</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected Task details, deliverables & reporting */}
        <div className="lg:col-span-1">
          {selectedTask ? (
            <div className="space-y-6">
              {/* Info Card */}
              <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white overflow-hidden">
                <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Détail de la tâche
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3 text-sm">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">{selectedTask.titre}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{selectedTask.description || 'Pas de description.'}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-xs space-y-1.5 text-slate-600 font-medium">
                    <div className="flex justify-between">
                      <span>Priorité :</span>
                      <strong className="capitalize font-bold text-slate-800">{selectedTask.priorite}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Statut actuel :</span>
                      <strong className="capitalize font-bold text-slate-800">{selectedTask.statut.replace('_', ' ')}</strong>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upload deliverable */}
              <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white overflow-hidden">
                <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-blue-900" /> Déposer un livrable
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <form onSubmit={handleUploadDeliverable} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="docTitre" className="text-xs font-bold text-slate-700">Titre du fichier/livrable *</Label>
                      <Input id="docTitre" required value={docTitre} onChange={(e) => setDocTitre(e.target.value)} placeholder="Ex: Rapport final d'organisation" className="h-9 text-xs rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="docDesc" className="text-xs font-bold text-slate-700">Notes ou remarques</Label>
                      <Input id="docDesc" value={docDesc} onChange={(e) => setDocDesc(e.target.value)} placeholder="Ex: Version finale PDF" className="h-9 text-xs rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="docFileUrl" className="text-xs font-bold text-slate-700">Lien du document joint *</Label>
                      <Input id="docFileUrl" required value={docFileUrl} onChange={(e) => setDocFileUrl(e.target.value)} placeholder="https://.../livrable.pdf" className="h-9 text-xs rounded-xl" />
                    </div>
                    <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold h-10 text-xs rounded-xl shadow-sm transition-all mt-2">
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> Attacher ce livrable
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Existing documents */}
              {documents.length > 0 && (
                <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white overflow-hidden">
                  <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Fichiers rattachés</span>
                      <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full font-bold">
                        {documents.length}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100 text-xs">
                      {documents.map(doc => (
                        <div key={doc.id} className="p-4 flex justify-between items-center gap-3">
                          <div>
                            <span className="font-bold text-slate-800 block">{doc.titre}</span>
                            {doc.description && <span className="text-[10px] text-slate-400 block">{doc.description}</span>}
                          </div>
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-900 font-extrabold hover:underline text-xs shrink-0"
                          >
                            Ouvrir <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="p-8 bg-slate-50 border border-slate-200/80 rounded-3xl text-center space-y-2 text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-xs font-bold text-slate-700">Sélectionnez une tâche à gauche</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Cliquez sur une tâche pour afficher ses détails complets et y rattachés vos rapports de travail.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

