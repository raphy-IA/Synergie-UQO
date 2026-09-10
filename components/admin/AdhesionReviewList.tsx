'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { approveMember, rejectMember } from '@/app/actions/admin';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, Eye, UserCheck, ShieldAlert, School, Phone, Users, Mail, HeartHandshake, Calendar, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MemberProfile {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string | null;
  categorie: string;
  programme_etudes: string | null;
  matricule_uqo: string | null;
  motivation_adhesion?: string | null;
  parrains?: string | null;
  notes_adhesion?: string | null;
  created_at: string;
}

interface AdhesionReviewListProps {
  initialMembers: MemberProfile[];
}

export default function AdhesionReviewList({ initialMembers }: AdhesionReviewListProps) {
  const [members, setMembers] = useState<MemberProfile[]>(initialMembers);
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
  const [detailsMember, setDetailsMember] = useState<MemberProfile | null>(null);
  const [motifRejet, setMotifRejet] = useState('');
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleApprove = async (memberId: string) => {
    setActionLoading(memberId);
    const res = await approveMember(memberId);
    setActionLoading(null);

    if (res?.success) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      if (detailsMember?.id === memberId) {
        setDetailsMember(null);
      }
      alert("Membre approuvé avec succès et courriel de bienvenue envoyé !");
    } else {
      alert(res?.error || "Une erreur est survenue.");
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedMember || !motifRejet.trim()) return;

    setActionLoading(selectedMember.id);
    const res = await rejectMember(selectedMember.id, motifRejet);
    setActionLoading(null);

    if (res?.success) {
      setMembers((prev) => prev.filter((m) => m.id !== selectedMember.id));
      setIsRejectOpen(false);
      if (detailsMember?.id === selectedMember.id) {
        setDetailsMember(null);
      }
      setMotifRejet('');
      setSelectedMember(null);
      alert("Candidature rejetée et courriel d'information envoyé.");
    } else {
      alert(res?.error || "Une erreur est survenue.");
    }
  };

  const getInitials = (prenom: string, nom: string) => {
    return `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase();
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {members.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <UserCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">Toutes les adhésions sont traitées !</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Il n&apos;y a actuellement aucune candidature en attente d&apos;approbation par le Conseil d&apos;Administration.
          </p>
        </div>
      ) : (
        <div className="w-full overflow-hidden">
          <Table className="w-full table-fixed layout-fixed border-collapse">
            <TableHeader className="bg-slate-50/90 border-b border-slate-200">
              <TableRow>
                <TableHead className="w-[22%] font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 pl-4">Candidat</TableHead>
                <TableHead className="w-[18%] font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3">Catégorie & Contact</TableHead>
                <TableHead className="w-[22%] font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3">Programme & Matricule</TableHead>
                <TableHead className="w-[14%] font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3">Parrainage</TableHead>
                <TableHead className="w-[10%] font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3">Date</TableHead>
                <TableHead className="w-[14%] font-bold text-[11px] text-slate-600 uppercase tracking-wider text-right py-3 pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {members.map((member) => {
                const hasParrainage = Boolean(member.motivation_adhesion || member.parrains || member.notes_adhesion);

                return (
                  <TableRow key={member.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="py-3 pl-4 whitespace-normal">
                      <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-blue-950 text-amber-400 font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-sm">
                          {getInitials(member.prenom, member.nom)}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <span className="font-bold text-slate-900 text-xs block truncate" title={`${member.prenom} ${member.nom}`}>
                            {member.prenom} {member.nom}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium block truncate" title={member.email}>
                            {member.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3 whitespace-normal">
                      <div className="space-y-0.5 min-w-0 overflow-hidden">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200/50 capitalize truncate max-w-full">
                          {member.categorie?.replace('_', ' ')}
                        </span>
                        {member.telephone && (
                          <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1 truncate" title={member.telephone}>
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{member.telephone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 whitespace-normal">
                      <div className="space-y-0.5 min-w-0 overflow-hidden">
                        <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 min-w-0" title={member.programme_etudes || 'Non spécifié'}>
                          <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{member.programme_etudes || 'Non spécifié'}</span>
                        </span>
                        {member.matricule_uqo && (
                          <span className="text-[10px] text-slate-500 font-mono font-medium block truncate">
                            Mat. {member.matricule_uqo}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 whitespace-normal">
                      {hasParrainage ? (
                        <Badge 
                          variant="secondary" 
                          className="bg-amber-50 text-amber-900 border-amber-200 text-[10px] font-semibold flex items-center gap-1 w-fit cursor-pointer hover:bg-amber-100 py-0.5 px-1.5"
                          onClick={() => setDetailsMember(member)}
                        >
                          <HeartHandshake className="w-3 h-3 text-amber-600 shrink-0" />
                          Renseigné
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Non renseigné</span>
                      )}
                    </TableCell>

                    <TableCell className="py-3 text-[11px] text-slate-500 font-medium whitespace-nowrap">
                      {new Date(member.created_at).toLocaleDateString('fr-CA', { dateStyle: 'short' })}
                    </TableCell>

                    <TableCell className="py-3 text-right pr-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 font-semibold rounded-md h-7 text-[11px] text-slate-700 hover:bg-slate-100 border-slate-200 px-2"
                          onClick={() => setDetailsMember(member)}
                          title="Consulter le dossier d'adhésion"
                        >
                          <Eye className="w-3 h-3 text-blue-800" /> Dossier
                        </Button>

                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md h-7 w-7 p-0 shrink-0 shadow-sm"
                          title="Approuver l'adhésion"
                          disabled={actionLoading !== null}
                          onClick={() => handleApprove(member.id)}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-md h-7 w-7 p-0 shrink-0"
                          title="Rejeter l'adhésion"
                          onClick={() => {
                            setSelectedMember(member);
                            setMotifRejet('');
                            setIsRejectOpen(true);
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ─── MODAL DIALOG DE REJET ─── */}
      {selectedMember && (
        <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
          <DialogContent className="rounded-2xl p-6 bg-white sm:max-w-md w-full">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-650" />
                Rejeter la candidature de {selectedMember.prenom} {selectedMember.nom}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Veuillez spécifier le motif précis du rejet. Un courriel explicatif sera automatiquement envoyé au candidat.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="motif" className="font-bold text-xs uppercase tracking-wider text-slate-700">Motif du rejet *</Label>
              <Input
                id="motif"
                placeholder="Ex: Matricule UQO non trouvé ou justificatif illisible."
                value={motifRejet}
                onChange={(e) => setMotifRejet(e.target.value)}
                className="h-10 rounded-lg border-slate-200 text-sm"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsRejectOpen(false)} className="font-semibold rounded-lg text-xs">Annuler</Button>
              <Button
                variant="destructive"
                onClick={handleRejectSubmit}
                disabled={!motifRejet.trim() || actionLoading !== null}
                className="font-semibold rounded-lg text-xs"
              >
                Confirmer le rejet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL CONSULTATION DOSSIER & PARRAINAGE ─── */}
      {detailsMember && (
        <Dialog open={!!detailsMember} onOpenChange={(open) => !open && setDetailsMember(null)}>
          <DialogContent className="rounded-2xl p-6 bg-white sm:max-w-3xl lg:max-w-4xl w-[92vw] max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-950 text-amber-400 font-extrabold text-base flex items-center justify-center shrink-0 shadow-md">
                    {getInitials(detailsMember.prenom, detailsMember.nom)}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-extrabold text-slate-900">
                      Dossier d&apos;adhésion — {detailsMember.prenom} {detailsMember.nom}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 flex items-center gap-3 mt-1 flex-wrap">
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {detailsMember.email}</span>
                      {detailsMember.telephone && (
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          • <Phone className="w-3.5 h-3.5 text-blue-700" /> {detailsMember.telephone}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-slate-400">
                        • <Calendar className="w-3.5 h-3.5" /> Soumis le {new Date(detailsMember.created_at).toLocaleDateString('fr-CA', { dateStyle: 'long' })}
                      </span>
                    </DialogDescription>
                  </div>
                </div>
                <Badge className="bg-amber-100 text-amber-900 border-amber-250 font-bold px-3 py-1 text-xs rounded-full">
                  En attente de décision du CA
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4 text-sm">
              {/* Grid des données principales de candidature */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/80 p-4 sm:p-5 rounded-xl border border-slate-200/70">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Catégorie statutaire</span>
                  <span className="font-extrabold text-blue-950 capitalize text-sm">{detailsMember.categorie?.replace('_', ' ')}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Matricule UQO</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{detailsMember.matricule_uqo || 'Non spécifié'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Programme d&apos;études</span>
                  <span className="font-bold text-slate-800 text-sm">{detailsMember.programme_etudes || 'Non spécifié'}</span>
                </div>
              </div>

              {/* Section Parrainage & Motivation élargie */}
              <div className="bg-gradient-to-br from-amber-50/80 via-amber-50/30 to-white rounded-2xl p-5 sm:p-6 border border-amber-200/80 space-y-5">
                <div className="flex items-center gap-2 border-b border-amber-200/60 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-amber-950">Informations de Parrainage & Justification d&apos;adhésion</h4>
                    <p className="text-xs text-amber-800/80">Éléments rédigés par le candidat lors de sa demande</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Motivation */}
                  <div className="space-y-2 md:col-span-2">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <HeartHandshake className="w-3.5 h-3.5 text-amber-700" /> Motivation & Justification de l&apos;adhésion
                    </span>
                    <div className="text-xs text-slate-800 bg-white p-4 rounded-xl border border-amber-200/60 leading-relaxed font-medium shadow-sm min-h-[70px]">
                      {detailsMember.motivation_adhesion ? detailsMember.motivation_adhesion : <span className="text-slate-400 italic">Aucune justification écrite fournie par le candidat.</span>}
                    </div>
                  </div>

                  {/* Parrains / Références */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-700" /> Parrains / Personnes références
                    </span>
                    <div className="text-xs text-slate-800 bg-white p-4 rounded-xl border border-amber-200/60 font-medium shadow-sm min-h-[60px]">
                      {detailsMember.parrains ? detailsMember.parrains : <span className="text-slate-400 italic">Aucun parrain ou personne référence indiqué.</span>}
                    </div>
                  </div>

                  {/* Notes CA */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-700" /> Notes complémentaires destinées au CA
                    </span>
                    <div className="text-xs text-slate-800 bg-white p-4 rounded-xl border border-amber-200/60 leading-relaxed font-medium shadow-sm min-h-[60px]">
                      {detailsMember.notes_adhesion ? detailsMember.notes_adhesion : <span className="text-slate-400 italic">Aucune note complémentaire.</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-slate-100 pt-4 mt-2">
              <Link 
                href={`/admin/membres/${detailsMember.id}`}
                className={buttonVariants({ size: "sm", variant: "outline", className: "font-semibold rounded-lg gap-1.5 text-xs w-full sm:w-auto" })}
              >
                <Eye className="w-3.5 h-3.5 text-blue-800" /> Consulter la fiche membre complète
              </Link>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="font-semibold rounded-lg text-xs"
                  onClick={() => setDetailsMember(null)}
                >
                  Fermer
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="font-semibold rounded-lg text-xs gap-1"
                  onClick={() => {
                    setSelectedMember(detailsMember);
                    setIsRejectOpen(true);
                  }}
                >
                  <X className="w-3.5 h-3.5" /> Rejeter
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs gap-1 shadow-md shadow-emerald-600/20"
                  disabled={actionLoading !== null}
                  onClick={() => handleApprove(detailsMember.id)}
                >
                  <Check className="w-3.5 h-3.5" />
                  {actionLoading === detailsMember.id ? 'Validation...' : 'Approuver la candidature'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
