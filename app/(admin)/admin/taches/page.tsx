'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckSquare, Clock, User, Award, Plus, Trash2, Calendar, FileText, Check, ArrowLeft, Search, Layers, CheckCircle2, Shield, Users, Building2 } from 'lucide-react';
import { getAssignableTargets, createTaskWithGovernance } from '@/app/actions/taches';

interface Tache {
  id: string;
  titre: string;
  description: string;
  statut: string;
  priorite: string;
  contexte: string;
  date_echeance: string | null;
  assigne_a: string | null;
  cible_type?: string;
  affectation_conjointe?: boolean;
  commission_id: string | null;
  evenement_id: string | null;
  profiles?: {
    prenom: string;
    nom: string;
  } | null;
  commissions?: {
    nom: string;
  } | null;
  evenements?: {
    titre: string;
  } | null;
  taches_assignations?: {
    profiles: {
      prenom: string;
      nom: string;
    };
    role_assignation: string;
  }[];
}

interface Member {
  id: string;
  prenom: string;
  nom: string;
  poste_association?: string;
}

interface Commission {
  id: string;
  nom: string;
}

interface Evenement {
  id: string;
  titre: string;
}

export default function AdminTasksPage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Tache[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Tache[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [priorityFilter, setPriorityFilter] = useState('tous');

  const [members, setMembers] = useState<Member[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [events, setEvents] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignableData, setAssignableData] = useState<any | null>(null);

  // View Mode: 'list' | 'form'
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');

  // Form State
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [statut, setStatut] = useState('a_faire');
  const [priorite, setPriorite] = useState('moyenne');
  const [contexte, setContexte] = useState('general');
  const [dateEcheance, setDateEcheance] = useState('');
  const [cibleType, setCibleType] = useState<'membre' | 'bureau' | 'commission'>('membre');
  const [cibleId, setCibleId] = useState('');
  const [evenementId, setEvenementId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let result = tasks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.titre.toLowerCase().includes(q) || 
        (t.profiles && `${t.profiles.prenom} ${t.profiles.nom}`.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== 'tous') {
      result = result.filter(t => t.statut === statusFilter);
    }
    if (priorityFilter !== 'tous') {
      result = result.filter(t => t.priorite === priorityFilter);
    }
    setFilteredTasks(result);
  }, [searchQuery, statusFilter, priorityFilter, tasks]);

  const fetchData = async () => {
    setLoading(true);
    const { data: tasksData } = await supabase
      .from('taches')
      .select(`
        *,
        profiles:assigne_a (prenom, nom),
        commissions:commission_id (nom),
        evenements:evenement_id (titre),
        taches_assignations (
          role_assignation,
          profiles (prenom, nom)
        )
      `)
      .order('created_at', { ascending: false });

    const { data: evtsData } = await supabase
      .from('evenements')
      .select('id, titre')
      .order('date_evenement', { ascending: false });

    const targets = await getAssignableTargets();
    setAssignableData(targets);

    if (tasksData) {
      setTasks(tasksData as any);
      setFilteredTasks(tasksData as any);
    }
    if (targets) {
      setMembers(targets.allowedMembers || []);
      setCommissions(targets.allowedCommissions || []);
    }
    if (evtsData) setEvents(evtsData);

    setLoading(false);
  };

  const handleOpenCreateForm = async () => {
    resetForm();
    const targets = await getAssignableTargets();
    setAssignableData(targets);
    if (targets) {
      setMembers(targets.allowedMembers || []);
      setCommissions(targets.allowedCommissions || []);
    }
    setViewMode('form');
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre) {
      alert("Veuillez renseigner le titre de la tâche.");
      return;
    }

    if (cibleType === 'membre' && !cibleId) {
      alert("Veuillez sélectionner un membre auquel attribuer cette tâche.");
      return;
    }

    if (cibleType === 'commission' && !cibleId) {
      alert("Veuillez sélectionner une commission de destination.");
      return;
    }

    setSubmitting(true);

    const res = await createTaskWithGovernance({
      titre,
      description,
      priorite: priorite as any,
      contexte: (cibleType === 'bureau' ? 'bureau' : cibleType === 'commission' ? 'commission' : contexte) as any,
      dateEcheance: dateEcheance ? new Date(dateEcheance).toISOString() : null,
      cibleType,
      cibleId: cibleType === 'bureau' ? null : cibleId,
      evenementId: contexte === 'ag' && evenementId ? evenementId : null,
    });

    setSubmitting(false);

    if (res.success) {
      alert("Tâche attribuée avec succès selon les règles de gouvernance !");
      resetForm();
      setViewMode('list');
      fetchData();
    } else {
      alert(res.error || "Erreur lors de la création de la tâche.");
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm("Voulez-vous supprimer cette tâche ?")) {
      const { error } = await supabase.from('taches').delete().eq('id', id);
      if (!error) {
        fetchData();
      }
    }
  };

  const updateTaskStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('taches')
      .update({ statut: newStatus })
      .eq('id', id);

    if (!error) {
      fetchData();
    }
  };

  const resetForm = () => {
    setTitre('');
    setDescription('');
    setStatut('a_faire');
    setPriorite('moyenne');
    setContexte('general');
    setDateEcheance('');
    setCibleType('membre');
    setCibleId('');
    setEvenementId('');
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
      
      {/* VUE 1 : LISTE DES TÂCHES (Défaut) */}
      {viewMode === 'list' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-blue-950">Attribution des Tâches</h1>
              <p className="text-sm text-slate-500">Affectez des missions aux membres du bureau, des commissions ou des événements.</p>
            </div>
            <Button
              onClick={handleOpenCreateForm}
              className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold px-5 h-11 rounded-xl shadow-md transition-all shrink-0 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Attribuer une Tâche
            </Button>
          </div>

          {/* Recherche & Filtres */}
          <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une tâche, un membre assigné..."
                  className="pl-9 h-10 border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Statut :</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 text-xs font-bold px-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="tous">Tous les statuts</option>
                    <option value="a_faire">À faire</option>
                    <option value="en_cours">En cours</option>
                    <option value="termine">Terminé</option>
                    <option value="annule">Annulé</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Priorité :</span>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="h-10 text-xs font-bold px-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="tous">Toutes les priorités</option>
                    <option value="haute">Haute</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="basse">Basse</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* Tableau des Tâches */}
          <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-900" /> Registre des tâches ({filteredTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <p className="text-center py-12 text-slate-400 text-sm">Chargement du suivi des tâches...</p>
              ) : filteredTasks.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs italic space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-bold text-slate-700">Aucune tâche ne correspond aux critères.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/70">
                      <TableRow>
                        <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider py-4 pl-6">Intitulé / Contexte</TableHead>
                        <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Assigné à</TableHead>
                        <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Priorité</TableHead>
                        <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Échéance</TableHead>
                        <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Statut</TableHead>
                        <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider text-right pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {filteredTasks.map((task) => (
                        <TableRow key={task.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="pl-6 py-4">
                            <div className="space-y-1">
                              <span className="font-extrabold text-slate-900 text-sm block">{task.titre}</span>
                              {task.description && (
                                <p className="text-xs text-slate-500 line-clamp-1 max-w-md">{task.description}</p>
                              )}
                              <span className="text-[10px] text-blue-900 font-bold bg-blue-50 px-2 py-0.5 rounded-full inline-block uppercase">
                                {task.contexte}
                                {task.contexte === 'commission' && task.commissions ? ` : ${task.commissions.nom}` : ''}
                                {task.contexte === 'ag' && task.evenements ? ` : ${task.evenements.titre}` : ''}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-800">
                            {task.profiles ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-bold">
                                <User className="w-3.5 h-3.5 text-blue-900" />
                                {task.profiles.prenom} {task.profiles.nom}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Non assignée</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full ${getPriorityBadge(task.priorite)}`}>
                              {task.priorite}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 font-medium">
                            {task.date_echeance ? (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {new Date(task.date_echeance).toLocaleDateString('fr-CA', { dateStyle: 'medium' })}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Aucune</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <select
                              value={task.statut}
                              onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                              className="text-xs font-bold p-1.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-900 shadow-sm"
                            >
                              <option value="a_faire">À faire</option>
                              <option value="en_cours">En cours</option>
                              <option value="termine">Terminé</option>
                              <option value="annule">Annulé</option>
                            </select>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-650 hover:bg-red-50 rounded-xl"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* VUE 2 : FORMULAIRE D'ATTRIBUTION DE TÂCHE */}
      {viewMode === 'form' && (
        <Card className="max-w-2xl mx-auto border border-slate-200/80 shadow-xl rounded-3xl bg-white overflow-hidden">
          <div className="h-1.5 bg-blue-900" />
          <form onSubmit={handleCreateTask}>
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-6 bg-slate-50/50">
              <div>
                <CardTitle className="text-xl font-extrabold text-slate-900">Attribuer une nouvelle tâche</CardTitle>
                <p className="text-xs text-slate-500">Spécifiez les objectifs, les responsables et les échéances.</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setViewMode('list')}
                className="gap-2 font-bold text-slate-600 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" /> Retour à la liste
              </Button>
            </CardHeader>
            <CardContent className="p-8 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="titre" className="font-bold text-xs uppercase tracking-wider text-slate-700">Titre de la tâche *</Label>
                <Input
                  id="titre"
                  required
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex: Rédaction du rapport d'activité annuel"
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="font-bold text-xs uppercase tracking-wider text-slate-700">Description & Consignes</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Consignes détaillées, livrables attendus..."
                  className="rounded-xl text-xs border-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="priorite" className="font-bold text-xs uppercase tracking-wider text-slate-700">Priorité *</Label>
                  <select
                    id="priorite"
                    value={priorite}
                    onChange={(e) => setPriorite(e.target.value)}
                    className="w-full h-11 p-2 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-blue-900"
                  >
                    <option value="basse">Basse</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="haute">Haute</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="statut" className="font-bold text-xs uppercase tracking-wider text-slate-700">Statut initial *</Label>
                  <select
                    id="statut"
                    value={statut}
                    onChange={(e) => setStatut(e.target.value)}
                    className="w-full h-11 p-2 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-blue-900"
                  >
                    <option value="a_faire">À faire</option>
                    <option value="en_cours">En cours</option>
                    <option value="termine">Terminé</option>
                  </select>
                </div>
              </div>

              {/* RÈGLES DE GOUVERNANCE ET CIBLAGE */}
              <div className="p-4 border rounded-2xl bg-blue-50/60 border-blue-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-blue-950">
                  <Shield className="w-4 h-4 text-amber-500" />
                  <span>Règles d&apos;attribution de gouvernance</span>
                </div>
                {assignableData?.currentUser && (
                  <p className="text-xs text-blue-900 font-medium">
                    Poste actuel : <strong className="uppercase">{assignableData.currentUser.poste || 'Membre'}</strong>
                    {assignableData.currentUser.isPresident && " — 👑 Vous pouvez attribuer des tâches à tout le monde, au bureau et aux commissions."}
                    {assignableData.currentUser.isVicePresident && " — 🛡️ Vous pouvez attribuer des tâches à tout le monde, au bureau et aux commissions (sauf le Président)."}
                    {assignableData.currentUser.isSecretaire && " — 📝 Vous pouvez attribuer des tâches aux commissions."}
                    {assignableData.currentUser.isResponsableComm && " — 🤝 Vous pouvez attribuer des tâches aux membres de votre commission."}
                  </p>
                )}

                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="cibleType" className="font-bold text-xs uppercase tracking-wider text-slate-700">Type de destination *</Label>
                  <select
                    id="cibleType"
                    value={cibleType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setCibleType(val);
                      setCibleId('');
                    }}
                    className="w-full h-11 p-2 border border-slate-200 rounded-xl bg-white text-xs font-extrabold text-blue-950 focus:ring-blue-900"
                  >
                    {assignableData?.permissions?.canAssignToAllMembers && (
                      <option value="membre">👤 Membre individuel</option>
                    )}
                    {assignableData?.permissions?.canAssignToBureau && (
                      <option value="bureau">🏢 Bureau Exécutif (Affectation conjointe à TOUS les membres du bureau)</option>
                    )}
                    {assignableData?.permissions?.canAssignToCommissions && (
                      <option value="commission">👥 Commission (Affectation conjointe au Responsable & Adjoint)</option>
                    )}
                    {!assignableData?.permissions?.canAssignToAllMembers && assignableData?.currentUser?.isResponsableComm && (
                      <option value="membre">👤 Membre de votre commission</option>
                    )}
                  </select>
                </div>

                {cibleType === 'membre' && (
                  <div className="space-y-1.5 pt-2">
                    <Label htmlFor="cibleIdMembre" className="font-bold text-xs uppercase tracking-wider text-slate-700">Sélectionner le membre destinataire *</Label>
                    <select
                      id="cibleIdMembre"
                      value={cibleId}
                      onChange={(e) => setCibleId(e.target.value)}
                      className="w-full h-11 p-2 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-blue-900"
                    >
                      <option value="">-- Choisir un membre --</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.prenom} {m.nom} {m.poste_association ? `(${m.poste_association})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {cibleType === 'commission' && (
                  <div className="space-y-1.5 pt-2">
                    <Label htmlFor="cibleIdComm" className="font-bold text-xs uppercase tracking-wider text-slate-700">Sélectionner la commission *</Label>
                    <select
                      id="cibleIdComm"
                      value={cibleId}
                      onChange={(e) => setCibleId(e.target.value)}
                      className="w-full h-11 p-2 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-blue-900"
                    >
                      <option value="">-- Choisir une commission --</option>
                      {commissions.map((c) => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-amber-800 font-bold bg-amber-50 p-2 rounded-lg border border-amber-200">
                      📌 Règle automatique : Cette tâche sera automatiquement attribuée conjointement au Responsable et à son Adjoint.
                    </p>
                  </div>
                )}

                {cibleType === 'bureau' && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-semibold space-y-1">
                    <span className="font-extrabold flex items-center gap-1.5 text-emerald-900">
                      🏛️ Affectation au Bureau Exécutif
                    </span>
                    <p>Cette tâche sera affectée conjointement à l&apos;ensemble des membres siégeant au Bureau Exécutif.</p>
                  </div>
                )}
              </div>

              {contexte === 'ag' && (
                <div className="space-y-1.5">
                  <Label htmlFor="event" className="font-bold text-xs uppercase tracking-wider text-slate-700">Événement de rattachement</Label>
                  <select
                    id="event"
                    value={evenementId}
                    onChange={(e) => setEvenementId(e.target.value)}
                    className="w-full h-11 p-2 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-blue-900"
                  >
                    <option value="">-- Choisir un événement --</option>
                    {events.map((evt) => (
                      <option key={evt.id} value={evt.id}>{evt.titre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="dateEcheance" className="font-bold text-xs uppercase tracking-wider text-slate-700">Date d&apos;échéance (Optionnel)</Label>
                <Input
                  id="dateEcheance"
                  type="date"
                  value={dateEcheance}
                  onChange={(e) => setDateEcheance(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 text-xs"
                />
              </div>
            </CardContent>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setViewMode('list')} className="font-bold rounded-xl">
                Annuler
              </Button>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl px-6 h-11">
                Créer & Assigner la tâche
              </Button>
            </div>
          </form>
        </Card>
      )}

    </div>
  );
}
