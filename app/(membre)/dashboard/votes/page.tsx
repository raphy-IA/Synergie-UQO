'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Vote, CheckCircle, Award } from 'lucide-react';

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

export default function VotesMemberPage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeVotes, setActiveVotes] = useState<VoteScrutin[]>([]);
  const [selectedVote, setSelectedVote] = useState<VoteScrutin | null>(null);
  const [voteOptions, setVoteOptions] = useState<VoteOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      fetchActiveVotes(user?.id);
    });
  }, [supabase]);

  const fetchActiveVotes = async (userId: string | undefined) => {
    setLoading(true);
    const { data: votesData, error } = await supabase
      .from('votes')
      .select('*')
      .eq('statut', 'actif');

    if (votesData && !error) {
      setActiveVotes(votesData);
    }
    setLoading(false);
  };

  const handleSelectVote = async (vote: VoteScrutin) => {
    setSelectedVote(vote);
    setSelectedOptionId(null);
    setHasVoted(false);

    // 1. Fetch options
    const { data: options } = await supabase
      .from('vote_options')
      .select('*')
      .eq('vote_id', vote.id);
    
    if (options) setVoteOptions(options);

    // 2. Check if user already voted
    if (currentUser) {
      const { data: participation } = await supabase
        .from('vote_participations')
        .select('*')
        .eq('vote_id', vote.id)
        .eq('profile_id', currentUser.id)
        .single();

      if (participation) {
        setHasVoted(true);
      }
    }
  };

  const handleVoteSubmit = async () => {
    if (!selectedVote || !selectedOptionId || !currentUser) return;
    setSubmitting(true);

    if (selectedVote.est_anonyme) {
      // 1. Enregistrer la participation pour bloquer le double vote (sans l'option_id)
      const { error: partErr } = await supabase
        .from('vote_participations')
        .insert({
          vote_id: selectedVote.id,
          profile_id: currentUser.id,
          option_id: null,
        });

      if (partErr) {
        console.error(partErr);
        alert("Erreur: Vous avez peut-être déjà voté à ce scrutin.");
        setSubmitting(false);
        return;
      }

      // 2. Enregistrer le bulletin anonyme décorrélé de toute identité
      const { error: ballotErr } = await supabase
        .from('vote_bulletins_anonymes')
        .insert({
          vote_id: selectedVote.id,
          option_id: selectedOptionId,
        });

      if (ballotErr) {
        console.error(ballotErr);
        alert("Erreur lors de l'enregistrement de votre bulletin anonyme.");
        setSubmitting(false);
        return;
      }

      setHasVoted(true);
    } else {
      // Vote classique non anonyme
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-500 absolute top-0 left-0 right-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 text-blue-900 rounded-2xl">
                <Vote className="w-6 h-6" />
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
          <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-base font-extrabold text-slate-900">Scrutins & Résolutions</CardTitle>
            <CardDescription className="text-xs text-slate-500">Sélectionnez une consultation active.</CardDescription>
          </CardHeader>
          <div className="p-4 space-y-2.5">
            {loading ? (
              <p className="text-slate-400 text-xs text-center py-8 italic">Chargement des scrutins...</p>
            ) : activeVotes.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Vote className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-slate-500 text-xs font-semibold">Aucun vote actif en ce moment.</p>
              </div>
            ) : (
              activeVotes.map((vote) => (
                <button
                  key={vote.id}
                  onClick={() => handleSelectVote(vote)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                    selectedVote?.id === vote.id
                      ? 'bg-blue-50/90 border-blue-900 text-blue-950 font-extrabold shadow-sm'
                      : 'hover:bg-slate-50 text-slate-700 border-slate-200/80'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${selectedVote?.id === vote.id ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Vote className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-bold truncate">{vote.titre}</div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">
                      Ferme le {new Date(vote.date_fin).toLocaleDateString('fr-CA', { dateStyle: 'medium' })}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Formulaire de vote */}
        <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white lg:col-span-2 overflow-hidden flex flex-col min-h-[420px]">
          {selectedVote ? (
            <CardContent className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
                  <h3 className="font-extrabold text-xl text-slate-900">{selectedVote.titre}</h3>
                  <span className="text-xs bg-blue-50 border border-blue-200 text-blue-900 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    {selectedVote.est_anonyme ? '🔒 Vote Anonyme Crypté' : '👤 Vote Nominatif'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">{selectedVote.description}</p>
              </div>

              {hasVoted ? (
                <div className="p-8 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl space-y-3 text-center my-auto">
                  <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="font-extrabold text-base text-emerald-900">Votre bulletin a été enregistré avec succès !</h4>
                  <p className="text-xs text-emerald-800 leading-relaxed max-w-md mx-auto">
                    Merci pour votre participation citoyenne. Les résultats consolidés seront communiqués à la clôture officielle du scrutin.
                  </p>
                </div>
              ) : (
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
                            ? 'bg-blue-900 text-white border-blue-900 font-extrabold shadow-md'
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
                    className="w-full bg-blue-900 hover:bg-blue-950 text-white font-extrabold py-4 h-12 rounded-2xl shadow-md text-sm mt-4"
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
