'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { HeartHandshake, CheckCircle2, AlertTriangle, Clock, User, FileText, ExternalLink, Check, X } from 'lucide-react';
import { getSolidarityFundClaims, processSolidarityDecision } from '@/app/actions/finances';

export default function SolidarityFundManager() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Decision Modal State
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [decision, setDecision] = useState<'approuve' | 'rejete' | 'verse'>('approuve');
  const [commentaire, setCommentaire] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    const data = await getSolidarityFundClaims();
    setClaims(data);
    setLoading(false);
  };

  const handleOpenDecision = (claim: any) => {
    setSelectedClaim(claim);
    setDecision('approuve');
    setCommentaire('');
  };

  const handleConfirmDecision = async () => {
    if (!selectedClaim) return;
    setIsSubmitting(true);

    const res = await processSolidarityDecision({
      claimId: selectedClaim.id,
      decision,
      commentaire,
    });

    setIsSubmitting(false);

    if (res.success) {
      alert("Décision sur le fonds de solidarité enregistrée !");
      setSelectedClaim(null);
      fetchClaims();
    } else {
      alert("Erreur lors de la décision.");
    }
  };

  const checkAdmissibility = (createdAt: string) => {
    const creation = new Date(createdAt);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return creation <= sixMonthsAgo;
  };

  const getStatutBadge = (st: string) => {
    switch (st) {
      case 'verse':
        return 'bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-200';
      case 'approuve':
        return 'bg-blue-100 text-blue-900 font-extrabold border border-blue-200';
      case 'rejete':
        return 'bg-red-100 text-red-800 font-bold border border-red-200';
      default:
        return 'bg-amber-100 text-amber-900 font-bold border border-amber-200';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-blue-950">Fonds de Solidarité & Aides d&apos;Urgence</h2>
        <p className="text-xs text-slate-500">Examinez et attribuez les soutiens financiers exceptionnels aux membres de l&apos;association.</p>
      </div>

      <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-purple-600" /> Demandes de Secours Soumises ({claims.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-12 text-slate-400 text-sm">Chargement des demandes d&apos;aides...</p>
          ) : claims.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs italic space-y-2">
              <HeartHandshake className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">Aucune demande de fonds de solidarité en cours.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/70">
                  <TableRow>
                    <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider py-4 pl-6">Membre Demandeur</TableHead>
                    <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Admissibilité (6 mois)</TableHead>
                    <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Montant Sollicité</TableHead>
                    <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Motif / Situation</TableHead>
                    <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Statut</TableHead>
                    <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {claims.map((item) => {
                    const isEligible = item.profiles?.created_at ? checkAdmissibility(item.profiles.created_at) : false;
                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-6 py-4">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-slate-900 text-sm block">
                              {item.profiles ? `${item.profiles.prenom} ${item.profiles.nom}` : 'Membre'}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">{item.profiles?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isEligible ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                              <Check className="w-3 h-3" /> Admissible (&gt;6 mois)
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" /> &lt;6 mois d&apos;ancienneté
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-black text-purple-900">
                          {Number(item.montant_demande).toFixed(2)} $ CAD
                        </TableCell>
                        <TableCell className="text-xs max-w-xs text-slate-600 line-clamp-2">
                          {item.motif}
                        </TableCell>
                        <TableCell>
                          <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full ${getStatutBadge(item.statut)}`}>
                            {item.statut}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            size="sm"
                            onClick={() => handleOpenDecision(item)}
                            className="bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl h-8 px-3"
                          >
                            Statuer
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL DE DÉCISION DU BUREAU */}
      {selectedClaim && (
        <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
          <DialogContent className="max-w-md bg-white rounded-3xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-purple-600" /> Arbitrage Aide de Solidarité
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Membre : <strong>{selectedClaim.profiles?.prenom} {selectedClaim.profiles?.nom}</strong> ({Number(selectedClaim.montant_demande).toFixed(2)} $ CAD)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border text-xs text-slate-700">
                <span className="font-bold text-slate-900 block">Motif de la situation d&apos;urgence :</span>
                <p className="italic leading-relaxed">{selectedClaim.motif}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs uppercase tracking-wider text-slate-700 block">Décision du Bureau *</Label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as any)}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-xs font-extrabold focus:ring-2 focus:ring-blue-900"
                >
                  <option value="approuve">Approuver l&apos;aide financière</option>
                  <option value="verse">Approuver & Marquer déboursé</option>
                  <option value="rejete">Refuser la demande</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="commentaire" className="font-bold text-xs uppercase tracking-wider text-slate-700 block">
                  Commentaire / Motif transmis au membre
                </Label>
                <Textarea
                  id="commentaire"
                  rows={3}
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Explication ou modalités de virement..."
                  className="rounded-xl text-xs border-slate-200"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSelectedClaim(null)} className="font-bold rounded-xl text-xs">
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
