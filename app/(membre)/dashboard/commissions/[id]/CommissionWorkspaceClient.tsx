'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Calendar,
  FileText,
  MessageSquare,
  DollarSign,
  Plus,
  ArrowLeft,
  Crown,
  Shield,
  User,
  Clock,
  MapPin,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Building2,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { createCommissionMeeting } from '@/app/actions/commissions-workspace';

interface CommissionWorkspaceClientProps {
  commission: any;
  responsableProfile: any;
  responsableAdjointProfile: any;
  userRole: string | null;
  isMember: boolean;
  isLeader: boolean;
  members: any[];
  meetings: any[];
  budgetSummary: {
    budgetAnnuel: number;
    totalDepense: number;
    soldeDisponible: number;
  };
  tasks: any[];
  documents: any[];
  forums: any[];
  currentUserId: string;
}

export default function CommissionWorkspaceClient({
  commission,
  responsableProfile,
  responsableAdjointProfile,
  userRole,
  isMember,
  isLeader,
  members,
  meetings,
  budgetSummary,
  tasks,
  documents,
  forums,
  currentUserId,
}: CommissionWorkspaceClientProps) {
  // Modal & Form States
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingTitre, setMeetingTitre] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingOrdre, setMeetingOrdre] = useState('');
  const [meetingLieu, setMeetingLieu] = useState('');
  const [isSubmittingMeeting, setIsSubmittingMeeting] = useState(false);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitre || !meetingDate) return;

    setIsSubmittingMeeting(true);
    const res = await createCommissionMeeting({
      commission_id: commission.id,
      titre: meetingTitre,
      date_reunion: meetingDate,
      ordre_du_jour: meetingOrdre,
      lieu_ou_lien: meetingLieu,
    });

    setIsSubmittingMeeting(false);
    if (res.success) {
      alert("Réunion de commission programmée avec succès !");
      setShowMeetingModal(false);
      setMeetingTitre('');
      setMeetingDate('');
      setMeetingOrdre('');
      setMeetingLieu('');
      window.location.reload();
    } else {
      alert(res.error || "Erreur lors de la création de la réunion.");
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-500 absolute top-0 left-0 right-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <Link
              href="/dashboard/commissions"
              className="h-10 w-10 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{commission.nom}</h1>
                {commission.est_systeme && (
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-amber-200">
                    Commission Permanente
                  </span>
                )}
                {userRole && (
                  <span className="bg-blue-900 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    {userRole}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-3xl leading-relaxed">
                {commission.description}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isLeader && (
              <Button
                onClick={() => setShowMeetingModal(true)}
                className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-xs h-11 px-5 rounded-2xl shadow-sm gap-2"
              >
                <Plus className="w-4 h-4" /> Programmer une réunion
              </Button>
            )}
            <Link href="/dashboard/evenements">
              <Button variant="outline" className="border-slate-200 text-slate-800 font-extrabold text-xs h-11 px-4 rounded-2xl">
                Proposer un Événement
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Program Meeting Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl rounded-3xl bg-white border-none overflow-hidden">
            <div className="h-1.5 bg-blue-900" />
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-lg font-extrabold text-slate-900">Programmer une réunion de commission</CardTitle>
              <CardDescription className="text-xs text-slate-500">Planifiez un temps de travail pour les membres de {commission.nom}.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleCreateMeeting} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mTitle" className="font-bold text-xs uppercase tracking-wider text-slate-700">Titre de la réunion *</Label>
                  <Input id="mTitle" required value={meetingTitre} onChange={(e) => setMeetingTitre(e.target.value)} placeholder="Ex: Ordre du jour préparatoire AG" className="h-11 rounded-xl border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mDate" className="font-bold text-xs uppercase tracking-wider text-slate-700">Date et Heure *</Label>
                  <Input id="mDate" type="datetime-local" required value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="h-11 rounded-xl border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mLieu" className="font-bold text-xs uppercase tracking-wider text-slate-700">Lieu ou Lien Visioconférence</Label>
                  <Input id="mLieu" value={meetingLieu} onChange={(e) => setMeetingLieu(e.target.value)} placeholder="Ex: Local UQO 2014 ou Lien Zoom/Teams" className="h-11 rounded-xl border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mOrdre" className="font-bold text-xs uppercase tracking-wider text-slate-700">Ordre du jour</Label>
                  <Textarea id="mOrdre" rows={3} value={meetingOrdre} onChange={(e) => setMeetingOrdre(e.target.value)} placeholder="Principaux points à aborder..." className="rounded-xl text-xs border-slate-200" />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="ghost" onClick={() => setShowMeetingModal(false)} className="rounded-xl text-xs font-bold">
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isSubmittingMeeting} className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-xs h-11 rounded-xl px-6">
                    {isSubmittingMeeting ? "Enregistrement..." : "Planifier"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs Container */}
      <Tabs defaultValue="organigramme" className="w-full flex flex-col gap-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 bg-slate-100/90 p-1.5 rounded-2xl gap-1 border border-slate-200/60">
          <TabsTrigger value="organigramme" className="rounded-xl text-xs font-bold py-2.5 gap-1.5">
            <Users className="w-4 h-4" /> Membres ({members.length + (responsableProfile ? 1 : 0) + (responsableAdjointProfile ? 1 : 0)})
          </TabsTrigger>
          <TabsTrigger value="taches" className="rounded-xl text-xs font-bold py-2.5 gap-1.5">
            <FileText className="w-4 h-4" /> Tâches ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="reunions" className="rounded-xl text-xs font-bold py-2.5 gap-1.5">
            <Calendar className="w-4 h-4" /> Réunions ({meetings.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-xl text-xs font-bold py-2.5 gap-1.5">
            <Download className="w-4 h-4" /> Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="forum" className="rounded-xl text-xs font-bold py-2.5 gap-1.5">
            <MessageSquare className="w-4 h-4" /> Discussion ({forums.length})
          </TabsTrigger>
          <TabsTrigger value="budget" className="rounded-xl text-xs font-bold py-2.5 gap-1.5">
            <DollarSign className="w-4 h-4" /> Budget (${budgetSummary.budgetAnnuel})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Organigramme & Membres */}
        <TabsContent value="organigramme" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Responsable Principal */}
            <Card className="border border-amber-200 shadow-md rounded-3xl bg-amber-50/40 p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <Crown className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-200/60 px-2.5 py-0.5 rounded-full">
                  Responsable Principal
                </span>
                <h3 className="font-extrabold text-lg text-slate-900">
                  {responsableProfile ? `${responsableProfile.prenom} ${responsableProfile.nom}` : 'Non désigné'}
                </h3>
                {responsableProfile && (
                  <div className="text-xs text-slate-600 font-medium space-y-0.5 pt-1">
                    <p>📧 {responsableProfile.email}</p>
                    {responsableProfile.telephone && <p>📞 {responsableProfile.telephone}</p>}
                  </div>
                )}
              </div>
            </Card>

            {/* Responsable Adjoint */}
            <Card className="border border-blue-200 shadow-md rounded-3xl bg-blue-50/40 p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-900 text-white flex items-center justify-center shrink-0 shadow-md">
                <Shield className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 bg-blue-200/60 px-2.5 py-0.5 rounded-full">
                  Responsable Adjoint
                </span>
                <h3 className="font-extrabold text-lg text-slate-900">
                  {responsableAdjointProfile ? `${responsableAdjointProfile.prenom} ${responsableAdjointProfile.nom}` : 'Non désigné'}
                </h3>
                {responsableAdjointProfile && (
                  <div className="text-xs text-slate-600 font-medium space-y-0.5 pt-1">
                    <p>📧 {responsableAdjointProfile.email}</p>
                    {responsableAdjointProfile.telephone && <p>📞 {responsableAdjointProfile.telephone}</p>}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Annuaire des membres */}
          <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-extrabold text-slate-900">Membres Statutaires Inscrits</CardTitle>
              <CardDescription className="text-xs text-slate-500">Membres actifs participant aux travaux de la commission.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {members.length === 0 ? (
                <p className="text-center py-10 text-slate-400 text-xs italic">Aucun autre membre directement inscrit à cette commission.</p>
              ) : (
                members.map((m: any) => {
                  const prof = m.profiles;
                  if (!prof) return null;
                  return (
                    <div key={m.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                          {prof.prenom?.[0]}{prof.nom?.[0]}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">{prof.prenom} {prof.nom}</span>
                          <span className="text-xs text-slate-500 capitalize">{m.role_commission || 'Membre actif'} • {prof.categorie}</span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">{prof.email}</span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Tâches */}
        <TabsContent value="taches" className="space-y-6">
          <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-extrabold text-slate-900">Tâches Associées à la Commission</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {tasks.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs italic">
                  Aucune tâche actuellement affectée à cette commission.
                </div>
              ) : (
                tasks.map((task: any) => (
                  <div key={task.id} className="p-5 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <span className="font-extrabold text-slate-900 text-sm block">{task.titre}</span>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{task.description || 'Sans description.'}</p>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-800 font-bold px-3 py-1 rounded-full uppercase">
                      {task.statut}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Réunions */}
        <TabsContent value="reunions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {meetings.length === 0 ? (
              <Card className="md:col-span-2 border border-dashed border-slate-200 rounded-3xl bg-white p-12 text-center">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-xs font-bold">Aucune réunion de commission programmée.</p>
                {isLeader && (
                  <Button onClick={() => setShowMeetingModal(true)} className="mt-4 bg-blue-900 text-white font-bold text-xs rounded-xl h-10 px-4">
                    Programmer une séance de travail
                  </Button>
                )}
              </Card>
            ) : (
              meetings.map((m: any) => (
                <Card key={m.id} className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-extrabold text-base text-slate-900">{m.titre}</h4>
                    <span className="text-[10px] bg-blue-50 text-blue-900 font-extrabold px-2.5 py-1 rounded-full border border-blue-200">
                      Séance de travail
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1.5 font-medium border-t border-b py-3">
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-900" />
                      {new Date(m.date_reunion).toLocaleDateString('fr-CA', { dateStyle: 'full' })} à {new Date(m.date_reunion).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {m.lieu_ou_lien && (
                      <p className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-900" />
                        {m.lieu_ou_lien}
                      </p>
                    )}
                  </div>
                  {m.ordre_du_jour && (
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Ordre du jour</span>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{m.ordre_du_jour}</p>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* TAB 4: Documents */}
        <TabsContent value="documents" className="space-y-6">
          <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-extrabold text-slate-900">Documents & Livrables de la Commission</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {documents.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs italic">
                  Aucun document actuellement déposé dans le dossier de cette commission.
                </div>
              ) : (
                documents.map((doc: any) => (
                  <div key={doc.id} className="p-5 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">{doc.titre}</span>
                      {doc.description && <span className="text-xs text-slate-500 block">{doc.description}</span>}
                    </div>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-900 font-bold text-xs flex items-center gap-1">
                      Ouvrir <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: Forum */}
        <TabsContent value="forum" className="space-y-6">
          <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-extrabold text-slate-900">Canal de Discussion Privé</CardTitle>
              <Link href="/dashboard/forum">
                <Button className="bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs h-9 px-4 rounded-xl">
                  Accéder au Forum Général
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {forums.length === 0 ? (
                <p className="text-center py-10 text-slate-400 text-xs italic">
                  Aucun sujet de discussion propre à cette commission pour le moment.
                </p>
              ) : (
                forums.map((f: any) => (
                  <div key={f.id} className="p-4 border rounded-2xl hover:bg-slate-50">
                    <span className="font-extrabold text-slate-900 text-sm block">{f.titre}</span>
                    <span className="text-xs text-slate-400">Par {f.profiles?.prenom} {f.profiles?.nom}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 6: Budget */}
        <TabsContent value="budget" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Budget Annuel Alloué</span>
              <p className="text-3xl font-extrabold text-blue-950">${budgetSummary.budgetAnnuel.toFixed(2)} CAD</p>
            </Card>

            <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Total Dépenses Approuvées</span>
              <p className="text-3xl font-extrabold text-amber-600">${budgetSummary.totalDepense.toFixed(2)} CAD</p>
            </Card>

            <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Solde Disponible</span>
              <p className="text-3xl font-extrabold text-emerald-600">${budgetSummary.soldeDisponible.toFixed(2)} CAD</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
