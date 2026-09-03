'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Vote, CheckCircle, BarChart, Lock } from 'lucide-react';
import PaymentButton from '@/components/dashboard/PaymentButton';

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

export default function VotesMemberPage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMemberApproved, setIsMemberApproved] = useState(false);
  const [allVotes, setAllVotes] = useState<VoteScrutin[]>([]);
  const [filteredVotes, setFilteredVotes] = useState<VoteScrutin[]>([]);
  const [activeTab, setActiveTab] = useState<'actifs' | 'clos'>('actifs');

  const [selectedVote, setSelectedVote] = useState<VoteScrutin | null>(null);
  const [voteOptions, setVoteOptions] = useState<VoteOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [results, setResults] = useState<VoteResult[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setCurrentUser(user);
        const { data: prof } = await supabase
          .from('profiles')
          .select('statut_adhesion, role')
          .eq('id', user.id)
          .maybeSingle();

        const isAppr = prof?.statut_adhesion === 'approuve';
        setIsMemberApproved(isAppr);

        if (isAppr) {
          fetchVotes();
        } else {
          setLoading(false);
        }
      }
    });
  }, [supabase]);

  const fetchVotes = async () => {
    setLoading(true);
    // Only fetch active and closed votes for approved members
    const { data: votesData, error } = await supabase
      .from('votes')
      .select('*')
      .in('statut', ['actif', 'clos'])
      .order('created_at', { ascending: false });

    if (votesData && !error) {
      setAllVotes(votesData);
    }
    setLoading(false);
  };

  useEffect(() => {
    let res = allVotes;
    if (activeTab === 'actifs') {
      res = allVotes.filter(v => v.statut === 'actif');
    } else if (activeTab === 'clos') {
      res = allVotes.filter(v => v.statut === 'clos');
    }

    setFilteredVotes(res);
    if (res.length > 0 && (!selectedVote || !res.some(v => v.id === selectedVote.id))) {
      handleSelectVote(res[0]);
    } else if (res.length === 0) {
      setSelectedVote(null);
    }
  }, [allVotes, activeTab]);

  const handleSelectVote = async (vote: VoteScrutin) => {
    setSelectedVote(vote);
    setSelectedOptionId(null);
    setHasVoted(false);
    setResults([]);

    // 1. Fetch options
    const { data: options } = await supabase
      .from('vote_options')
      .select('*')
      .eq('vote_id', vote.id);

    if (options) setVoteOptions(options);

    // 2. Check if user already voted
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: participation } = await supabase
        .from('vote_participations')
        .select('*')
        .eq('vote_id', vote.id)
        .eq('profile_id', user.id)
        .maybeSingle();

      if (participation) {
        setHasVoted(true);
      }
    }

    // 3. If closed, fetch tally
    if (vote.statut === 'clos' && options) {
      const tally: Record<string, number> = {};
      options.forEach(o => { tally[o.id] = 0; });

      if (vote.est_anonyme) {
        const { data: ballots } = await supabase
          .from('vote_bulletins_anonymes')
          .select('option_id')
          .eq('vote_id', vote.id);

        (ballots || []).forEach(b => {
          if (b.option_id && tally[b.option_id] !== undefined) {
            tally[b.option_id]++;
          }
        });
      } else {
        const { data: parts } = await supabase
          .from('vote_participations')
          .select('option_id')
          .eq('vote_id', vote.id);

        (parts || []).forEach(p => {
          if (p.option_id && tally[p.option_id] !== undefined) {
            tally[p.option_id]++;
          }
        });
      }

      setResults(Object.keys(tally).map(key => ({ option_id: key, count: tally[key] })));
    }
  };

  const handleVoteSubmit = async () => {
    if (!selectedVote || !selectedOptionId || !currentUser) return;
    setSubmitting(true);

    if (selectedVote.est_anonyme) {
      const { error: partErr } = await supabase
        .from('vote_participations')
        .insert({
          vote_id: selectedVote.id,
          profile_id: currentUser.id,
          option_id: null,
        });

      if (partErr) {
        console.error(partErr);
        alert("Erreur : Vous avez peut-être déjà voté à ce scrutin.");
        setSubmitting(false);
        return;
      }

      const { error: ballotErr } = await supabase
        .from('vote_bulletins_anonymes')
        .insert({
          vote_id: selectedVote.id,
          option_id: selectedOptionId,
        });

      if (ballotErr) {
        console.error(ballotErr);
        alert("Erreur lors de l'enregistrement de votre bulletin.");
        setSubmitting(false);
        return;
      }

      setHasVoted(true);
    } else {
      const { error } = await supabase
        .from('vote_participations')
        .insert({
          vote_id: selectedVote.id,
          profile_id: currentUser.id,
          option_id: selectedOptionId,
        });

      if (!error) {
        setHasVoted(true);
      } else {
        alert("Erreur lors de l'enregistrement de votre vote.");
      }
    }
    setSubmitting(false);
  };

  if (!loading && !isMemberApproved) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Card className="bg-white rounded-3xl p-8 sm:p-12 border border-amber-200 shadow-md text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">Droit de vote réservé aux membres en règle</h2>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Votre candidature a été approuvée par le Conseil d&apos;Administration. Toutefois, conformément aux statuts de l&apos;association, l&apos;accès à l&apos;Espace Scrutins & Votes et le droit de vote sont strictement réservés aux adhérents ayant réglé leur cotisation annuelle.
            </p>
          </div>
          <div className="pt-2 max-w-xs mx-auto">
            <PaymentButton />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-500 absolute top-0 left-0 right-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 text-blue-950 rounded-2xl">
                <Vote className="w-6 h-6 text-blue-950" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Espace Scrutins & Votes</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Exercez vos droits démocratiques associatifs. Participez aux votes et délibérations officielles de Synergie UQO.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Liste des scrutins */}
        <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white lg:col-span-1 overflow-hidden">
          <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-3">
            <CardTitle className="text-base font-extrabold text-slate-900">Scrutins & Résolutions</CardTitle>
            
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl text-xs font-extrabold">
              <button
                onClick={() => setActiveTab('actifs')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  activeTab === 'actifs' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Actifs ({allVotes.filter(v => v.statut === 'actif').length})
              </button>
              <button
                onClick={() => setActiveTab('clos')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  activeTab === 'clos' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Clôturés ({allVotes.filter(v => v.statut === 'clos').length})
              </button>
            </div>
          </CardHeader>

          <div className="p-4 space-y-2.5">
            {loading ? (
              <p className="text-slate-400 text-xs text-center py-8 italic">Chargement des scrutins...</p>
            ) : filteredVotes.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Vote className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-slate-500 text-xs font-semibold">Aucun scrutin dans cette section.</p>
              </div>
            ) : (
              filteredVotes.map((vote) => (
                <button
                  key={vote.id}
                  onClick={() => handleSelectVote(vote)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                    selectedVote?.id === vote.id
                      ? 'bg-blue-950 text-white font-extrabold shadow-md border-blue-950'
                      : 'hover:bg-slate-50 text-slate-700 border-slate-200/80'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${selectedVote?.id === vote.id ? 'bg-amber-500 text-blue-950' : 'bg-slate-100 text-slate-600'}`}>
                    <Vote className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-bold truncate">{vote.titre}</div>
                    <div className={`text-[11px] font-medium mt-1 ${selectedVote?.id === vote.id ? 'text-blue-200' : 'text-slate-400'}`}>
                      Ferme le {new Date(vote.date_fin).toLocaleDateString('fr-CA', { dateStyle: 'medium' })}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Panneau de vote / Dépouillement */}
        <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white lg:col-span-2 overflow-hidden flex flex-col min-h-[420px]">
          {selectedVote ? (
            <CardContent className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 font-extrabold mb-2 inline-block">
                      {selectedVote.statut === 'actif' ? 'Scrutin Actif' : 'Scrutin Clôturé'}
                    </span>
                    <h3 className="font-extrabold text-xl sm:text-2xl text-slate-900">{selectedVote.titre}</h3>
                  </div>

                  <span className="text-xs bg-blue-50 border border-blue-200 text-blue-950 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    {selectedVote.est_anonyme ? '🔒 Vote Anonyme Crypté' : '👤 Vote Nominatif'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">{selectedVote.description}</p>
              </div>

              {/* STATUT: CLOS (Affichage des résultats) */}
              {selectedVote.statut === 'clos' ? (
                <div className="space-y-5 pt-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-blue-950 uppercase tracking-wider">
                    <BarChart className="w-4 h-4 text-amber-500" /> Résultats du dépouillement officiel
                  </div>
                  <div className="space-y-3">
                    {voteOptions.map((opt) => {
                      const res = results.find(r => r.option_id === opt.id);
                      const count = res ? res.count : 0;
                      const total = results.reduce((sum, item) => sum + item.count, 0) || 1;
                      const percent = Math.round((count / total) * 100);

                      return (
                        <div key={opt.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50 space-y-2">
                          <div className="flex justify-between items-center text-xs sm:text-sm font-extrabold text-slate-900">
                            <span>{opt.texte}</span>
                            <span className="text-blue-950 font-black">{count} voix ({percent}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-900 to-amber-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : hasVoted ? (
                /* DEJA VOTE */
                <div className="p-8 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl space-y-3 text-center my-auto">
                  <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="font-extrabold text-base text-emerald-900">Votre bulletin a été enregistré avec succès !</h4>
                  <p className="text-xs text-emerald-800 leading-relaxed max-w-md mx-auto">
                    Merci pour votre participation citoyenne. Les résultats consolidés seront communiqués à la clôture officielle du scrutin.
                  </p>
                </div>
              ) : (
                /* FORMULAIRE DE VOTE ACTIF */
                <div className="space-y-5 pt-2">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700">Sélectionnez votre bulletin de vote *</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {voteOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedOptionId(opt.id)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                          selectedOptionId === opt.id
                            ? 'bg-blue-950 text-white border-blue-950 font-extrabold shadow-md'
                            : 'hover:bg-slate-50 text-slate-800 border-slate-200 bg-white'
                        }`}
                      >
                        <span className="text-sm font-semibold">{opt.texte}</span>
                        {selectedOptionId === opt.id && <CheckCircle className="w-5 h-5 text-amber-400 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={handleVoteSubmit}
                    disabled={!selectedOptionId || submitting}
                    className="w-full bg-blue-950 hover:bg-blue-900 text-white font-extrabold py-4 h-12 rounded-2xl shadow-md text-sm mt-4 disabled:opacity-50"
                  >
                    {submitting ? "Enregistrement du bulletin..." : "Confirmer mon vote"}
                  </Button>
                </div>
              )}
            </CardContent>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs sm:text-sm p-12 text-center space-y-3">
              <Vote className="w-12 h-12 text-slate-300" />
              <p className="font-medium text-slate-500">Sélectionnez un scrutin dans la liste de gauche pour consulter les détails et exprimer votre vote.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
