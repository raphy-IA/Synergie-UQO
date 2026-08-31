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
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-blue-950">Espace Scrutins & Votes</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des scrutins */}
        <Card className="border border-slate-100 shadow-md rounded-2xl bg-white lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-bold">Scrutins en cours</CardTitle>
          </CardHeader>
          <div className="p-4 space-y-3">
            {loading ? (
              <p className="text-slate-400 text-xs">Chargement...</p>
            ) : activeVotes.length === 0 ? (
              <p className="text-slate-455 text-xs">Aucun vote actif en ce moment.</p>
            ) : (
              activeVotes.map((vote) => (
                <button
                  key={vote.id}
                  onClick={() => handleSelectVote(vote)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${
                    selectedVote?.id === vote.id ? 'bg-blue-50/80 border-blue-200 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Vote className="w-5 h-5 text-blue-900" />
                  <div>
                    <div className="text-sm">{vote.titre}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Ferme le {new Date(vote.date_fin).toLocaleDateString('fr-CA')}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Formulaire de vote */}
        <Card className="border border-slate-100 shadow-md rounded-2xl bg-white lg:col-span-2 overflow-hidden flex flex-col justify-between">
          {selectedVote ? (
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <h3 className="font-extrabold text-lg text-slate-900">{selectedVote.titre}</h3>
                <p className="text-sm text-slate-650 leading-relaxed">{selectedVote.description}</p>
                <div className="text-[10px] bg-slate-50 border px-3 py-1.5 rounded-lg w-fit text-slate-500 font-medium flex items-center gap-1.5">
                  {selectedVote.est_anonyme ? 'Vote Anonyme' : 'Vote Nominal'}
                </div>
              </div>

              {hasVoted ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl space-y-2 text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-base">Votre participation a été enregistrée</h4>
                  <p className="text-xs">Merci d&apos;avoir voté ! Les résultats seront publiés à la clôture du scrutin.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-slate-900">Sélectionnez une option :</h4>
                  <div className="space-y-2">
                    {voteOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedOptionId(opt.id)}
                        className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all ${
                          selectedOptionId === opt.id ? 'bg-blue-900 text-white border-blue-900 font-bold shadow-sm' : 'hover:bg-slate-50 text-slate-700 bg-white'
                        }`}
                      >
                        <span className="text-sm">{opt.texte}</span>
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={handleVoteSubmit}
                    disabled={!selectedOptionId || submitting}
                    className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold py-6 rounded-xl mt-4"
                  >
                    Confirmer mon vote
                  </Button>
                </div>
              )}
            </CardContent>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-12">
              Sélectionnez un scrutin pour voir les détails et participer au vote.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
