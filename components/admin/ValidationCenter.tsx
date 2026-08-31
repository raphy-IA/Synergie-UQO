'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Shield, CheckCircle2, XCircle, AlertCircle, Clock, Calendar, User, DollarSign, FileText, Vote, Building2, Check, ArrowRight, Eye, ExternalLink, MapPin, Users } from 'lucide-react';
import { getPendingValidations, processValidationDecision, getEntityDetails } from '@/app/actions/validation';

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

  // Preview Modal State
  const [previewItem, setPreviewItem] = useState<{ val: any; details: any } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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

  const handleOpenPreview = async (val: any) => {
    setPreviewLoading(true);
    const details = await getEntityDetails(val.type_entite, val.entite_id);
    setPreviewItem({ val, details });
    setPreviewLoading(false);
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

  const getDirectEntityUrl = (type: string, id: string) => {
    switch (type) {
      case 'evenement': return `/admin/evenements?id=${id}`;
      case 'article': return `/admin/articles?id=${id}`;
      case 'vote': return `/admin/votes?id=${id}`;
      case 'partenaire': return `/admin/partenaires?id=${id}`;
      case 'depense': return `/admin/finances?id=${id}`;
      default: return '/admin';
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

              <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-2">
                <a
                  href={getDirectEntityUrl(val.type_entite, val.entite_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 font-bold text-xs h-9 rounded-xl border border-slate-200 text-blue-900 bg-white hover:bg-slate-100 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Voir la page réelle de l&apos;élément
                </a>
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
                {getEntityIcon(selectedValidation.type_entite)} Décision : Soumission {selectedValidation.type_entite}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Statuez sur l&apos;approbation, demandez des révisions ou rejetez la soumission.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <a
                href={getDirectEntityUrl(selectedValidation.type_entite, selectedValidation.entite_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 font-bold text-xs h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-blue-900"
              >
                <ExternalLink className="w-4 h-4" /> Ouvrir la page réelle de l&apos;événement / de la fiche
              </a>

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

      {/* MODAL DE PRÉVISUALISATION DÉTAILLÉE DE L'ÉLÉMENT */}
      {previewItem && (
        <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
          <DialogContent className="max-w-2xl bg-white rounded-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                {getEntityIcon(previewItem.val.type_entite)} Fiche Détaillée : {previewItem.val.type_entite.toUpperCase()}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Examinez les informations complètes avant de prendre votre décision.
              </DialogDescription>
            </DialogHeader>

            {previewLoading ? (
              <p className="text-center py-8 text-slate-400 text-xs italic">Chargement de la fiche...</p>
            ) : !previewItem.details ? (
              <p className="text-center py-8 text-slate-400 text-xs italic">Élément introuvable ou supprimé.</p>
            ) : (
              <div className="space-y-6 pt-2">
                
                {/* 1. DÉTAILS ÉVÉNEMENT */}
                {previewItem.val.type_entite === 'evenement' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                      <h3 className="text-lg font-black text-blue-950">{previewItem.details.titre}</h3>
                      <p className="text-xs text-slate-600">{previewItem.details.description || 'Sans description.'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="p-3 border rounded-xl bg-slate-50">
                        <span className="text-slate-400 font-semibold block">Date & Heure :</span>
                        <span className="font-extrabold text-slate-900">
                          {new Date(previewItem.details.date_evenement).toLocaleString('fr-CA')}
                        </span>
                      </div>

                      <div className="p-3 border rounded-xl bg-slate-50">
                        <span className="text-slate-400 font-semibold block">Lieu / Format :</span>
                        <span className="font-extrabold text-slate-900 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-900" /> {previewItem.details.lieu} ({previewItem.details.format_evt})
                        </span>
                      </div>

                      <div className="p-3 border rounded-xl bg-slate-50">
                        <span className="text-slate-400 font-semibold block">Tarification :</span>
                        <span className="font-extrabold text-slate-900">
                          {previewItem.details.est_payant ? `${previewItem.details.prix} $ CAD` : 'Gratuit'}
                        </span>
                      </div>

                      <div className="p-3 border rounded-xl bg-slate-50">
                        <span className="text-slate-400 font-semibold block">Audience :</span>
                        <span className="font-extrabold text-blue-900 uppercase">
                          {previewItem.details.audience}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. DÉTAILS ARTICLE */}
                {previewItem.val.type_entite === 'article' && (
                  <div className="space-y-4">
                    {previewItem.details.image_couverture && (
                      <img src={previewItem.details.image_couverture} alt="Couverture" className="w-full h-48 object-cover rounded-2xl border" />
                    )}
                    <h3 className="text-xl font-black text-slate-900">{previewItem.details.titre}</h3>
                    <div className="p-4 rounded-2xl bg-slate-50 border text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
                      {previewItem.details.contenu}
                    </div>
                  </div>
                )}

                {/* 3. DÉTAILS VOTE */}
                {previewItem.val.type_entite === 'vote' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-black text-slate-900">{previewItem.details.titre}</h3>
                    <p className="text-xs text-slate-600">{previewItem.details.description}</p>
                    
                    <div className="space-y-1 pt-2">
                      <Label className="font-bold text-xs uppercase text-slate-700">Bulletins / Options au choix :</Label>
                      <div className="space-y-1.5">
                        {previewItem.details.options?.map((o: any) => (
                          <div key={o.id} className="p-2.5 rounded-xl border bg-slate-50 font-bold text-xs text-slate-800">
                            • {o.texte}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. DÉTAILS PARTENAIRE */}
                {previewItem.val.type_entite === 'partenaire' && (
                  <div className="space-y-4">
                    {previewItem.details.logo_url && (
                      <img src={previewItem.details.logo_url} alt="Logo" className="h-16 object-contain rounded-xl border p-2 bg-white" />
                    )}
                    <h3 className="text-xl font-black text-slate-900">{previewItem.details.nom}</h3>
                    <p className="text-xs text-slate-600">{previewItem.details.description}</p>
                    {previewItem.details.site_web && (
                      <a href={previewItem.details.site_web} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-900 font-bold hover:underline flex items-center gap-1">
                        Visiter le site web <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {/* 5. DÉTAILS DÉPENSE */}
                {previewItem.val.type_entite === 'depense' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                      <h3 className="text-lg font-black text-slate-900">{previewItem.details.titre}</h3>
                      <span className="text-xl font-extrabold text-emerald-700 block pt-1">
                        {Number(previewItem.details.montant).toFixed(2)} $ CAD
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{previewItem.details.description}</p>
                    {previewItem.details.justificatif_url && (
                      <a href={previewItem.details.justificatif_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-900 font-extrabold hover:underline">
                        <FileText className="w-4 h-4" /> Consulter la facture / justificatif
                      </a>
                    )}
                  </div>
                )}

              </div>
            )}

            <DialogFooter className="pt-4 flex justify-end gap-2 border-t">
              <Button type="button" variant="outline" onClick={() => setPreviewItem(null)} className="font-bold rounded-xl text-xs">
                Fermer la prévisualisation
              </Button>
              <Button
                onClick={() => {
                  const val = previewItem?.val;
                  setPreviewItem(null);
                  if (val) handleOpenDecisionModal(val);
                }}
                className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-xl px-5 text-xs h-10 gap-1.5"
              >
                <Shield className="w-4 h-4 text-amber-400" /> Statuer sur cette demande
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
