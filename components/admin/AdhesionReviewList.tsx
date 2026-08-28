'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { approveMember, rejectMember } from '@/app/actions/admin';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, Eye } from 'lucide-react';

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
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // Member ID currently processing

  const handleApprove = async (memberId: string) => {
    setActionLoading(memberId);
    const res = await approveMember(memberId);
    setActionLoading(null);

    if (res?.success) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      alert("Membre approuvé avec succès et courriel envoyé !");
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
      alert("Candidature rejetée et courriel envoyé.");
    } else {
      alert(res?.error || "Une erreur est survenue.");
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {members.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          Aucune adhésion en attente d'approbation.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidat</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Courriel</TableHead>
              <TableHead>Programme</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-semibold text-slate-900">
                  {member.prenom} {member.nom}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {member.categorie}
                  </span>
                </TableCell>
                <TableCell className="text-slate-600">{member.email}</TableCell>
                <TableCell className="text-slate-600 truncate max-w-[200px]">
                  {member.programme_etudes || 'N/A'}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Link 
                    href={`/admin/membres/${member.id}`}
                    className={buttonVariants({ size: "sm", variant: "outline", className: "gap-1.5" })}
                  >
                    <Eye className="w-3.5 h-3.5" /> Détails
                  </Link>

                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    disabled={actionLoading !== null}
                    onClick={() => handleApprove(member.id)}
                  >
                    <Check className="w-3.5 h-3.5" /> Approuver
                  </Button>

                  <Dialog open={isRejectOpen && selectedMember?.id === member.id} onOpenChange={(open) => {
                    setIsRejectOpen(open);
                    if (open) {
                      setSelectedMember(member);
                      setMotifRejet('');
                    }
                  }}>
                    <DialogTrigger render={<Button size="sm" variant="destructive" className="gap-1" />}>
                      <X className="w-3.5 h-3.5" /> Rejeter
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Rejeter la candidature</DialogTitle>
                        <DialogDescription>
                          Veuillez spécifier le motif du rejet. Un courriel automatique sera envoyé au candidat.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-2">
                        <Label htmlFor="motif">Motif de rejet</Label>
                        <Input
                          id="motif"
                          placeholder="Ex: Justificatif de matricule invalide ou illisible."
                          value={motifRejet}
                          onChange={(e) => setMotifRejet(e.target.value)}
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Annuler</Button>
                        <Button
                          variant="destructive"
                          onClick={handleRejectSubmit}
                          disabled={!motifRejet.trim() || actionLoading !== null}
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
