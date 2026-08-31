'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { approveMember, rejectMember } from '@/app/actions/admin';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, Eye, UserCheck, ShieldAlert, Sparkles, School } from 'lucide-react';

interface MemberProfile {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string | null;
  categorie: string;
  programme_etudes: string | null;
  matricule_uqo: string | null;
  created_at: string;
}

interface AdhesionReviewListProps {
  initialMembers: MemberProfile[];
}

export default function AdhesionReviewList({ initialMembers }: AdhesionReviewListProps) {
  const [members, setMembers] = useState<MemberProfile[]>(initialMembers);
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
  const [motifRejet, setMotifRejet] = useState('');
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleApprove = async (memberId: string) => {
    setActionLoading(memberId);
    const res = await approveMember(memberId);
    setActionLoading(null);

    if (res?.success) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
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
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-lg overflow-hidden">
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
        <Table>
          <TableHeader className="bg-slate-50/70">
            <TableRow>
              <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider py-4">Candidat</TableHead>
              <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Catégorie</TableHead>
              <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Programme & Matricule</TableHead>
              <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Date demande</TableHead>
              <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {members.map((member) => (
              <TableRow key={member.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-900 text-amber-400 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm">
                      {getInitials(member.prenom, member.nom)}
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 text-sm block">
                        {member.prenom} {member.nom}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {member.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200/60 capitalize">
                    {member.categorie?.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate max-w-[220px]">
                      <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {member.programme_etudes || 'Non spécifié'}
                    </span>
                    {member.matricule_uqo && (
                      <span className="text-[10px] text-slate-500 font-mono font-semibold block">
                        Matricule : {member.matricule_uqo}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-slate-500 font-medium">
                  {new Date(member.created_at).toLocaleDateString('fr-CA', { dateStyle: 'medium' })}
                </TableCell>
                <TableCell className="text-right space-x-2 pr-6">
                  <Link 
                    href={`/admin/membres/${member.id}`}
                    className={buttonVariants({ size: "sm", variant: "outline", className: "gap-1.5 font-bold rounded-xl h-9" })}
                  >
                    <Eye className="w-3.5 h-3.5" /> Détails
                  </Link>

                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 rounded-xl h-9 shadow-sm"
                    disabled={actionLoading !== null}
                    onClick={() => handleApprove(member.id)}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {actionLoading === member.id ? 'Validation...' : 'Approuver'}
                  </Button>

                  <Dialog open={isRejectOpen && selectedMember?.id === member.id} onOpenChange={(open) => {
                    setIsRejectOpen(open);
                    if (open) {
                      setSelectedMember(member);
                      setMotifRejet('');
                    }
                  }}>
                    <DialogTrigger
                      render={
                        <Button size="sm" variant="destructive" className="gap-1 font-bold rounded-xl h-9">
                          <X className="w-3.5 h-3.5" /> Rejeter
                        </Button>
                      }
                    />
                    <DialogContent className="rounded-3xl p-6 bg-white">
                      <DialogHeader className="space-y-2">
                        <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                          <ShieldAlert className="w-5 h-5 text-red-650" />
                          Rejeter la candidature de {selectedMember?.prenom} {selectedMember?.nom}
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
                          className="h-10 rounded-xl border-slate-200"
                        />
                      </div>
                      <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsRejectOpen(false)} className="font-bold rounded-xl">Annuler</Button>
                        <Button
                          variant="destructive"
                          onClick={handleRejectSubmit}
                          disabled={!motifRejet.trim() || actionLoading !== null}
                          className="font-bold rounded-xl"
                        >
                          Confirmer le rejet
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

