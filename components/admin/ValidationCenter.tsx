'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Shield, CheckCircle2, XCircle, AlertCircle, Clock, Calendar, User, DollarSign, FileText, Vote, Building2, Check, ArrowRight } from 'lucide-react';
import { getPendingValidations, processValidationDecision } from '@/app/actions/validation';

export default function ValidationCenter() {
  const [validations, setValidations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('tous');

  // Decision Modal State
  const [selectedValidation, setSelectedValidation] = useState<any | null>(null);
  const [decision, setDecision] = useState<'approuve' | 'rejete' | 'modifications_demandees'>('approuve');
  const [commentaire, setCommentaire] = useState('');
  const [dateEffet, setDateEffet] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchValidations();
  }, []);

  const fetchValidations = async () => {
    setLoading(true);
    const data = await getPendingValidations();
    setValidations(data);
    setLoading(false);
  };

  const handleOpenDecisionModal = (val: any) => {
    setSelectedValidation(val);
    setDecision('approuve');
    setCommentaire('');
    setDateEffet(val.date_effet_programmee ? new Date(val.date_effet_programmee).toISOString().slice(0, 16) : '');
  };

  const handleConfirmDecision = async () => {
    if (!selectedValidation) return;
    setIsSubmitting(true);

    const res = await processValidationDecision({
      validationId: selectedValidation.id,
      decision,
      commentaire,
      dateEffet: dateEffet || null,
    });

    setIsSubmitting(false);

    if (res.success) {
      alert("Décision de validation enregistrée avec succès !");
      setSelectedValidation(null);
      fetchValidations();
    } else {
      alert(res.error || "Erreur lors du traitement de la décision.");
    }
  };

  const filtered = filterType === 'tous' ? validations : validations.filter(v => v.type_entite === filterType);

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'evenement': return <Calendar className="w-5 h-5 text-amber-500" />;
      case 'article': return <FileText className="w-5 h-5 text-blue-900" />;
      case 'vote': return <Vote className="w-5 h-5 text-blue-900" />;
      case 'partenaire': return <Building2 className="w-5 h-5 text-amber-500" />;
      case 'depense': return <DollarSign className="w-5 h-5 text-emerald-600" />;
      default: return <Shield className="w-5 h-5 text-blue-900" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-blue-950">Centre de Validation & Gouvernance</h2>
          <p className="text-xs text-slate-500">Examinez et approuvez les soumissions d&apos;événements, articles, votes, partenaires et dépenses.</p>
        </div>

        {/* Filtres par type */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl flex-wrap">
          {['tous', 'evenement', 'article', 'vote', 'partenaire', 'depense'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                filterType === type ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {type === 'tous' ? 'Toutes' : type}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-center py-12 text-xs italic">Chargement des demandes de validation...</p>
      ) : filtered.length === 0 ? (
        <Card className="border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-2 bg-white">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="font-extrabold text-slate-900 text-base">Aucune demande en attente de validation</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">Toutes les soumissions récentes ont été examinées et validées.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(val => (
            <Card key={val.id} className="border border-slate-200/80 shadow-md rounded-3xl bg-white overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-slate-100">
                      {getEntityIcon(val.type_entite)}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block">
                        Demande #{val.type_entite}
                      </span>
                      <span className="text-xs font-bold text-blue-900 capitalize">
                        {val.statut_validation === 'en_attente_n1' ? 'Niveau 1 (Examen initial)' : 'Niveau 2 (Validation Présidence)'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> En attente
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Soumis par :</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {val.profiles ? `${val.profiles.prenom} ${val.profiles.nom}` : 'Membre'}
                    </span>
                  </div>
                  {val.date_effet_programmee && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Date d&apos;effet souhaitée :</span>
                      <span className="font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md">
                        {new Date(val.date_effet_programmee).toLocaleDateString('fr-CA', { dateStyle: 'short' })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Date de soumission :</span>
                    <span>{new Date(val.created_at).toLocaleDateString('fr-CA', { dateStyle: 'short' })}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button
                  onClick={() => handleOpenDecisionModal(val)}
                  className="w-full bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-xs h-10 rounded-xl gap-2 shadow-sm"
                >
                  <Shield className="w-4 h-4 text-amber-400" /> Statuer sur la soumission <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL DE DÉCISION DE VALIDATION */}
      {selectedValidation && (
        <Dialog open={!!selectedValidation} onOpenChange={() => setSelectedValidation(null)}>
          <DialogContent className="max-w-md bg-white rounded-3xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                {getEntityIcon(selectedValidation.type_entite)} Decision : Soumission {selectedValidation.type_entite}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Statuez sur l&apos;approbation, demandez des révisions ou rejetez la soumission.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-bold text-xs uppercase tracking-wider text-slate-700 block">Décision *</Label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as any)}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-extrabold focus:ring-2 focus:ring-blue-900"
                >
                  <option value="approuve">Approuver & Valider</option>
                  <option value="modifications_demandees">Demander des modifications</option>
                  <option value="rejete">Rejeter la demande</option>
                </select>
              </div>

              {decision === 'approuve' && (
                <div className="space-y-1.5">
                  <Label htmlFor="dateEffet" className="font-bold text-xs uppercase tracking-wider text-slate-700 block">
                    Date d&apos;application / d&apos;effet différée (Optionnel)
                  </Label>
                  <Input
                    id="dateEffet"
                    type="datetime-local"
                    value={dateEffet}
                    onChange={(e) => setDateEffet(e.target.value)}
                    className="h-11 rounded-xl border-slate-200 text-xs"
                  />
                  <p className="text-[10px] text-slate-400">Si non renseigné, la publication/exécution sera immédiate.</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="commentaire" className="font-bold text-xs uppercase tracking-wider text-slate-700 block">
                  Commentaires & Consignes {decision !== 'approuve' && '*'}
                </Label>
                <Textarea
                  id="commentaire"
                  rows={3}
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder={decision === 'approuve' ? "Félicitations ou consignes d'exécution..." : "Précisez les motifs de rejet ou modifications..."}
                  className="rounded-xl text-xs border-slate-200"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSelectedValidation(null)} className="font-bold rounded-xl text-xs">
                Annuler
              </Button>
              <Button
                onClick={handleConfirmDecision}
                disabled={isSubmitting}
                className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-xl px-5 text-xs h-10"
              >
                {isSubmitting ? 'Enregistrement...' : 'Confirmer la décision'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
