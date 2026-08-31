'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { BarChart, Vote as VoteIcon, Plus, Trash2, ArrowLeft, Search, ShieldCheck, CheckCircle2, Lock, Clock, Sparkles } from 'lucide-react';

interface VoteScrutin {
  id: string;
  titre: string;
  description: string;
  date_debut: string;
  date_fin: string;
  est_anonyme: boolean;
  statut: string;
}

interface VoteOption {
  id: string;
  texte: string;
}

interface VoteResult {
  option_id: string;
  count: number;
}

export default function AdminVotesPage() {
  const supabase = createClient();
  const [votes, setVotes] = useState<VoteScrutin[]>([]);
  const [filteredVotes, setFilteredVotes] = useState<VoteScrutin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [loading, setLoading] = useState(true);

  // View Mode: 'list' | 'form' | 'results'
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'results'>('list');

  // Selected Vote & Results
  const [selectedVote, setSelectedVote] = useState<VoteScrutin | null>(null);
  const [voteOptions, setVoteOptions] = useState<VoteOption[]>([]);
  const [results, setResults] = useState<VoteResult[]>([]);

  // Form State
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [estAnonyme, setEstAnonyme] = useState(true);
  const [statut, setStatut] = useState('planifie');
  const [optionsText, setOptionsText] = useState<string[]>(['Pour', 'Contre', 'Abstention']); // Default options

  useEffect(() => {
    fetchVotes();
  }, []);

  useEffect(() => {
    let result = votes;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v => v.titre.toLowerCase().includes(q) || (v.description && v.description.toLowerCase().includes(q)));
    }
    if (statusFilter !== 'tous') {
      result = result.filter(v => v.statut === statusFilter);
    }
    setFilteredVotes(result);
  }, [searchQuery, statusFilter, votes]);

  const fetchVotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && !error) {
      setVotes(data);
      setFilteredVotes(data);
    }
    setLoading(false);
  };

  const handleOpenCreateForm = () => {
    resetForm();
    setSelectedVote(null);
    setViewMode('form');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre || !dateDebut || !dateFin) {
      alert('Veuillez remplir les champs obligatoires (Titre, Date de début et Date de fin).');
      return;
    }

    const validOptions = optionsText.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      alert("Vous devez spécifier au moins 2 options de vote.");
      return;
    }

    // 1. Insert Vote
    const { data: voteData, error: voteErr } = await supabase
      .from('votes')
      .insert({
        titre,
        description,
        date_debut: new Date(dateDebut).toISOString(),
        date_fin: new Date(dateFin).toISOString(),
        est_anonyme: estAnonyme,
        statut,
      })
      .select()
      .single();

    if (voteErr || !voteData) {
      console.error(voteErr);
      alert("Erreur lors de la création du scrutin.");
      return;
    }

    // 2. Insert Options
    const optionsPayload = validOptions.map(txt => ({
      vote_id: voteData.id,
      texte: txt,
    }));

    const { error: optErr } = await supabase
      .from('vote_options')
      .insert(optionsPayload);

    if (!optErr) {
      alert("Scrutin créé avec succès !");
      resetForm();
      setViewMode('list');
      fetchVotes();
    } else {
      alert("Erreur lors de l'enregistrement des options.");
    }
  };

  const handleAddOptionField = () => {
    setOptionsText([...optionsText, '']);
  };

  const handleOptionTextChange = (index: number, val: string) => {
    const updated = [...optionsText];
    updated[index] = val;
    setOptionsText(updated);
  };

  const handleRemoveOptionField = (index: number) => {
    if (optionsText.length <= 2) return;
    const updated = optionsText.filter((_, i) => i !== index);
    setOptionsText(updated);
  };

  const handleOpenResults = async (vote: VoteScrutin) => {
    setSelectedVote(vote);
    setViewMode('results');

    // Fetch options
    const { data: opts } = await supabase
      .from('vote_options')
      .select('*')
      .eq('vote_id', vote.id);

    if (opts) setVoteOptions(opts);

    // Calculate count per option
    const tally: { [key: string]: number } = {};
    opts?.forEach(o => { tally[o.id] = 0; });

    if (vote.est_anonyme) {
      // Fetch anonymized ballots
      const { data: ballots } = await supabase
        .from('vote_bulletins_anonymes')
        .select('option_id')
        .eq('vote_id', vote.id);

      if (ballots) {
        ballots.forEach(b => {
          if (b.option_id && tally[b.option_id] !== undefined) {
            tally[b.option_id]++;
          }
        });
      }
    } else {
      // Fetch public participations
      const { data: parts } = await supabase
        .from('vote_participations')
        .select('option_id')
        .eq('vote_id', vote.id);

      if (parts) {
        parts.forEach(p => {
          if (p.option_id && tally[p.option_id] !== undefined) {
            tally[p.option_id]++;
          }
        });
      }
    }

    const resList = Object.keys(tally).map(key => ({
      option_id: key,
      count: tally[key],
    }));
    setResults(resList);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce scrutin ?')) {
      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('id', id);

      if (!error) {
        fetchVotes();
        if (selectedVote?.id === id) {
          setSelectedVote(null);
          setViewMode('list');
        }
      }
    }
  };

  const resetForm = () => {
    setTitre('');
    setDescription('');
    setDateDebut('');
    setDateFin('');
    setEstAnonyme(true);
    setStatut('planifie');
    setOptionsText(['Pour', 'Contre', 'Abstention']);
  };

  const getStatutBadge = (st: string) => {
    switch (st) {
      case 'actif':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold';
      case 'planifie':
        return 'bg-blue-100 text-blue-900 border border-blue-200 font-bold';
      case 'clos':
        return 'bg-red-100 text-red-800 border border-red-200 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 font-bold';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* VUE 1 : LISTE DES SCRUTINS (Défaut) */}
      {viewMode === 'list' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-blue-950">Gestion du Vote Électronique</h1>
              <p className="text-sm text-slate-500">Créez et suivez les décomptes de voix pour les assemblées et résolutions de l&apos;association.</p>
            </div>
            <Button
              onClick={handleOpenCreateForm}
              className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold px-5 h-11 rounded-xl shadow-md transition-all shrink-0 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Créer un Scrutin
            </Button>
          </div>

          {/* Recherche & Filtre */}
          <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un scrutin..."
                  className="pl-9 h-10 border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-bold text-slate-500 shrink-0">Statut :</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 text-xs font-bold px-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-900 w-full md:w-44"
                >
                  <option value="tous">Tous les scrutins</option>
                  <option value="actif">Actifs (En cours)</option>
                  <option value="planifie">Planifiés</option>
                  <option value="clos">Clos</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Grille des Scrutins */}
          {loading ? (
            <p className="text-center py-16 text-slate-400 text-sm">Chargement des scrutins...</p>
          ) : filteredVotes.length === 0 ? (
            <Card className="border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-3 bg-white">
              <VoteIcon className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-extrabold text-slate-800 text-base">Aucun scrutin trouvé</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'tous' ? 'Essayez de réinitialiser vos filtres.' : 'Cliquez sur le bouton ci-dessus pour ouvrir un nouveau scrutin.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVotes.map((vote) => (
                <Card key={vote.id} className="border border-slate-200/80 shadow-md rounded-3xl bg-white overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full ${getStatutBadge(vote.statut)}`}>
                        {vote.statut}
                      </span>
                      {vote.est_anonyme && (
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-500" /> Anonyme
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-extrabold text-slate-900 text-lg leading-snug line-clamp-2">{vote.titre}</h3>
                      {vote.description && <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{vote.description}</p>}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                        <span>Début : {new Date(vote.date_debut).toLocaleDateString('fr-CA', { dateStyle: 'medium' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Fin : {new Date(vote.date_fin).toLocaleDateString('fr-CA', { dateStyle: 'medium' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenResults(vote)}
                      className="text-xs font-bold gap-1.5 rounded-xl h-9 text-blue-900 border-blue-200 hover:bg-blue-50"
                    >
                      <BarChart className="w-3.5 h-3.5 text-amber-500" /> Dépouillement & Résultats
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(vote.id)}
                      className="h-9 w-9 text-red-650 hover:bg-red-50 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VUE 2 : FORMULAIRE DE CRÉATION DE SCRUTIN */}
      {viewMode === 'form' && (
        <Card className="max-w-2xl mx-auto border border-slate-200/80 shadow-xl rounded-3xl bg-white overflow-hidden">
          <div className="h-1.5 bg-blue-900" />
          <form onSubmit={handleSave}>
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-6 bg-slate-50/50">
              <div>
                <CardTitle className="text-xl font-extrabold text-slate-900">Créer un nouveau scrutin</CardTitle>
                <p className="text-xs text-slate-500">Configurez la résolution et les options soumises au vote.</p>
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
                <Label htmlFor="titre" className="font-bold text-xs uppercase tracking-wider text-slate-700">Titre du scrutin *</Label>
                <Input
                  id="titre"
                  required
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex: Élection des membres du bureau exécutif 2026"
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="font-bold text-xs uppercase tracking-wider text-slate-700">Question / Texte de la résolution</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Énoncez clairement la question posée aux adhérents..."
                  className="rounded-xl text-xs border-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="debut" className="font-bold text-xs uppercase tracking-wider text-slate-700">Ouverture des votes *</Label>
                  <Input
                    id="debut"
                    type="datetime-local"
                    required
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="h-11 rounded-xl border-slate-200 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fin" className="font-bold text-xs uppercase tracking-wider text-slate-700">Clôture des votes *</Label>
                  <Input
                    id="fin"
                    type="datetime-local"
                    required
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="h-11 rounded-xl border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="statut" className="font-bold text-xs uppercase tracking-wider text-slate-700">Statut initial *</Label>
                <select
                  id="statut"
                  value={statut}
                  onChange={(e) => setStatut(e.target.value)}
                  className="w-full h-11 p-2 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-blue-900"
                >
                  <option value="planifie">Planifié (Ouverture à la date prévue)</option>
                  <option value="actif">Actif (Ouvert immédiatement)</option>
                  <option value="clos">Clos</option>
                </select>
              </div>

              <div className="flex items-center space-x-3 p-4 border rounded-2xl bg-slate-50/50">
                <Checkbox
                  id="anonyme"
                  checked={estAnonyme}
                  onCheckedChange={(checked) => setEstAnonyme(checked === true)}
                  className="w-5 h-5"
                />
                <div>
                  <Label htmlFor="anonyme" className="cursor-pointer font-bold text-xs text-slate-800 block">Scrutin Anonyme Sécurisé</Label>
                  <span className="text-[10px] text-slate-500">Le choix de vote sera découplé de l&apos;identité du votant.</span>
                </div>
              </div>

              {/* Options de vote */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <Label className="font-bold text-xs uppercase tracking-wider text-slate-900 block">Options de réponse au bulletin *</Label>
                {optionsText.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder={`Option ${idx + 1}`}
                      required
                      value={opt}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                      className="h-10 rounded-xl border-slate-200 text-xs"
                    />
                    {optionsText.length > 2 && (
                      <Button size="icon" variant="ghost" className="text-red-650 h-9 w-9 rounded-xl shrink-0" onClick={() => handleRemoveOptionField(idx)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={handleAddOptionField} className="text-xs font-bold rounded-xl gap-1">
                  <Plus className="w-3.5 h-3.5" /> Ajouter une option
                </Button>
              </div>
            </CardContent>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setViewMode('list')} className="font-bold rounded-xl">
                Annuler
              </Button>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl px-6 h-11">
                Lancer le scrutin
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* VUE 3 : DÉPOUILLEMENT & RÉSULTATS EN DIRECT */}
      {viewMode === 'results' && selectedVote && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => setViewMode('list')} className="gap-2 font-bold text-slate-600">
            <ArrowLeft className="w-4 h-4" /> Retour à la liste des scrutins
          </Button>

          <Card className="border border-slate-200/80 shadow-xl rounded-3xl bg-white overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-blue-950 text-white space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <BarChart className="w-4 h-4" /> Dépouillement en direct
              </div>
              <h2 className="text-2xl font-extrabold">{selectedVote.titre}</h2>
              {selectedVote.description && <p className="text-xs text-blue-200">{selectedVote.description}</p>}
            </div>

            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-2xl bg-slate-50/50 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Total de bulletins :</span>
                  <span className="text-lg font-black text-slate-900">
                    {results.reduce((sum, item) => sum + item.count, 0)} Voix exprimée(s)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Mode d&apos;anonymat :</span>
                  <span className="text-sm font-bold text-emerald-700 flex items-center gap-1 pt-1">
                    <ShieldCheck className="w-4 h-4" /> {selectedVote.est_anonyme ? 'Scrutin secret crypté' : 'Vote nominatif'}
                  </span>
                </div>
              </div>

              <div className="space-y-5">
                <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Répartition des votes par option</h3>
                {voteOptions.map((opt) => {
                  const res = results.find(r => r.option_id === opt.id);
                  const count = res ? res.count : 0;
                  const total = results.reduce((sum, item) => sum + item.count, 0) || 1;
                  const percent = Math.round((count / total) * 100);
                  return (
                    <div key={opt.id} className="p-4 border border-slate-150 rounded-2xl bg-white space-y-2 shadow-sm">
                      <div className="flex justify-between items-center text-sm font-extrabold text-slate-900">
                        <span>{opt.texte}</span>
                        <span className="text-blue-900 font-black">{count} voix ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-800 to-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
