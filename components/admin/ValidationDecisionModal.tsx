'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Shield, Calendar, FileText, Vote, Building2, DollarSign } from 'lucide-react';
import { getPendingValidations, processValidationDecision } from '@/app/actions/validation';

interface ValidationDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  typeEntite: 'evenement' | 'article' | 'vote' | 'partenaire' | 'depense';
  entiteId: string;
  redirectUrl?: string;
  onSuccess?: () => void;
}

export default function ValidationDecisionModal({
  isOpen,
  onClose,
  typeEntite,
  entiteId,
  redirectUrl = '/admin/validations',
  onSuccess,
}: ValidationDecisionModalProps) {
  const [validationReq, setValidationReq] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<'approuve' | 'rejete' | 'modifications_demandees'>('approuve');
  const [commentaire, setCommentaire] = useState('');
  const [dateEffet, setDateEffet] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && entiteId) {
      fetchValidationRequest();
    }
  }, [isOpen, entiteId, typeEntite]);

  const fetchValidationRequest = async () => {
    setLoading(true);
    const pendingList = await getPendingValidations();
    const match = pendingList.find(
      (v: any) => v.type_entite === typeEntite && v.entite_id === entiteId
    );
    setValidationReq(match || null);
    if (match?.date_effet_programmee) {
      setDateEffet(new Date(match.date_effet_programmee).toISOString().slice(0, 16));
    } else {
      setDateEffet('');
    }
    setDecision('approuve');
    setCommentaire('');
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (!validationReq) {
      alert("Erreur : Aucune demande de validation en attente trouvée pour cet élément.");
      return;
    }
    setIsSubmitting(true);

    const res = await processValidationDecision({
      validationId: validationReq.id,
      decision,
      commentaire,
      dateEffet: dateEffet || null,
    });

    setIsSubmitting(false);

    if (res.success) {
      alert("Votre décision de validation a été enregistrée avec succès !");
      onClose();
      if (onSuccess) {
        onSuccess();
      } else if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } else {
      alert(res.error || "Erreur lors du traitement de la décision.");
    }
  };

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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md bg-white rounded-3xl p-6 space-y-4">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            {getEntityIcon(typeEntite)} Décision : Soumission {typeEntite.toUpperCase()}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Statuez sur l&apos;approbation, demandez des révisions ou rejetez cette soumission.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-center py-6 text-xs text-slate-400 italic">Vérification de la demande de validation...</p>
        ) : !validationReq ? (
          <div className="p-4 rounded-2xl bg-amber-50 text-amber-900 text-xs text-center space-y-2">
            <p className="font-bold">Aucune demande en attente</p>
            <p>Cet élément a déjà été traité ou n&apos;est pas en cours de validation.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 border rounded-xl bg-slate-50 text-xs space-y-1">
              <span className="text-slate-500 block">Demande actuelle :</span>
              <span className="font-extrabold text-blue-950 uppercase">
                {validationReq.statut_validation === 'en_attente_n1' ? 'Validation Niveau 1 (Secrétariat / Bureau)' : 'Validation Niveau 2 (Présidence / CA)'}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-xs uppercase tracking-wider text-slate-700 block">Décision *</Label>
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value as any)}
                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-extrabold focus:ring-2 focus:ring-blue-900"
              >
                <option value="approuve">Approuver & Valider la soumission</option>
                <option value="modifications_demandees">Demander des modifications (Renvoyer à l&apos;auteur)</option>
                <option value="rejete">Rejeter définitivement la soumission</option>
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
                <p className="text-[10px] text-slate-400">Si non renseigné, l&apos;exécution et la publication seront immédiates.</p>
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
                placeholder={decision === 'approuve' ? "Félicitations ou consignes d'exécution..." : "Précisez les motifs de rejet ou les corrections demandées..."}
                className="rounded-xl text-xs border-slate-200"
              />
            </div>
          </div>
        )}

        <DialogFooter className="pt-2 flex justify-end gap-2 border-t">
          <Button type="button" variant="outline" onClick={onClose} className="font-bold rounded-xl text-xs">
            Annuler
          </Button>
          {validationReq && (
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting || loading}
              className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-xl px-5 text-xs h-10"
            >
              {isSubmitting ? 'Enregistrement...' : 'Confirmer la décision'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
