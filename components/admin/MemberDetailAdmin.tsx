'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { updateMemberRole, updateMemberPoste, suspendMember, reactivateMember, adminResetPassword, deleteMember } from '@/app/actions/admin';
import { createClient } from '@/lib/supabase/client';
import MemberCardQR from '@/components/dashboard/MemberCardQR';
import { QRCodeSVG } from 'qrcode.react';
import { 
  User, GraduationCap, Briefcase, Calendar, ShieldCheck, Mail, Phone, MapPin, 
  Globe, Key, UserCheck, UserX, AlertTriangle, ArrowLeft, Trash2, Users, Clock,
  Edit3, Sliders, Lock, QrCode, CreditCard
} from 'lucide-react';

export default function MemberDetailAdmin({ 
  profile, 
  currentUserRole = 'membre',
  initialAssignments = []
}: { 
  profile: any; 
  currentUserRole?: string;
  initialAssignments?: any[];
}) {
  const router = useRouter();
  const supabase = createClient();

  // Modal QR Code State
  const [showQRModal, setShowQRModal] = useState(false);

  // Mode édition sécurisé (verrouillé par défaut pour éviter toute modification accidentelle)
  const [editRoleMode, setEditRoleMode] = useState(false);
  const [editPosteMode, setEditPosteMode] = useState(false);
  const [editPasswordMode, setEditPasswordMode] = useState(false);
  
  // State for Role
  const [role, setRole] = useState(profile.role || 'membre');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [roleSuccess, setRoleSuccess] = useState(false);
  
  // State for Poste
  const primaryAssignment = initialAssignments[0] || null;
  const [roleBureau, setRoleBureau] = useState(primaryAssignment?.role_bureau || 'aucun');
  const [titrePersonnalise, setTitrePersonnalise] = useState(primaryAssignment?.titre_personnalise || '');
  const [isUpdatingPoste, setIsUpdatingPoste] = useState(false);
  const [posteSuccess, setPosteSuccess] = useState(false);
  
  // State for Password
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  
  // State for Status
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getInitials = (prenom: string, nom: string) => {
    return `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase();
  };

  const getMemberDuration = (createdAtStr: string | null) => {
    if (!createdAtStr) return 'Non disponible';
    const created = new Date(createdAtStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return "Aujourd'hui";
    if (diffDays === 1) return 'Depuis 1 jour';
    if (diffDays < 30) return `Depuis ${diffDays} jours`;
    
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `Depuis ${diffMonths} mois (${diffDays} jours)`;
    }
    
    const diffYears = (diffDays / 365).toFixed(1);
    return `Depuis ${diffYears} an(s)`;
  };

  const handleUpdateRole = async () => {
    setIsUpdatingRole(true);
    setRoleSuccess(false);
    try {
      await updateMemberRole(profile.id, role);
      setRoleSuccess(true);
      setEditRoleMode(false);
      setTimeout(() => setRoleSuccess(false), 3000);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la mise à jour du rôle.");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleUpdatePoste = async () => {
    setIsUpdatingPoste(true);
    setPosteSuccess(false);
    try {
      await supabase
        .from('bureau_gouvernance')
        .delete()
        .eq('profile_id', profile.id);

      if (roleBureau !== 'aucun') {
        const { error } = await supabase
          .from('bureau_gouvernance')
          .insert({
            profile_id: profile.id,
            role_bureau: roleBureau,
            titre_personnalise: titrePersonnalise || null,
          });

        if (error) throw error;
      }

      setPosteSuccess(true);
      setEditPosteMode(false);
      setTimeout(() => setPosteSuccess(false), 3000);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'affectation du poste associatif.");
    } finally {
      setIsUpdatingPoste(false);
    }
  };

  const handleStatusChange = async (isSuspend: boolean) => {
    setIsUpdatingStatus(true);
    try {
      if (isSuspend) {
        await suspendMember(profile.id);
      } else {
        await reactivateMember(profile.id);
      }
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) return;
    setIsUpdatingPassword(true);
    setPasswordSuccess(false);
    try {
      await adminResetPassword(profile.id, newPassword);
      setNewPassword('');
      setPasswordSuccess(true);
      setEditPasswordMode(false);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la mise à jour du mot de passe');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteMember = async () => {
    const confirmFirst = window.confirm(`ATTENTION: Êtes-vous sûr de vouloir supprimer définitivement le membre ${profile.prenom} ${profile.nom} ?\nCette action est irréversible.`);
    if (!confirmFirst) return;

    const confirmSecond = window.confirm(`CONFIRMATION FINALE: En confirmant, le profil du membre sera effacé ET tous ses accès d'authentification seront révoqués.\n\nSouhaitez-vous vraiment procéder à la suppression ?`);
    if (!confirmSecond) return;

    setIsDeleting(true);
    try {
      const res = await deleteMember(profile.id);
      if (res?.error) {
        alert(`Erreur : ${res.error}`);
      } else {
        alert("Le membre et ses accès ont été supprimés avec succès.");
        router.push('/admin/membres');
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert("Une erreur inattendue est survenue.");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatValue = (val: any) => val || <span className="text-slate-400 italic">Non spécifié</span>;

  const getStatusBadge = () => {
    switch (profile.statut_adhesion) {
      case 'approuve':
        return <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-800 border-emerald-200 text-xs py-1 px-3 rounded-full font-bold">Actif (Approuvé)</Badge>;
      case 'suspendu':
        return <Badge variant="destructive" className="text-xs py-1 px-3 rounded-full font-bold">Suspendu</Badge>;
      case 'en_attente_approbation':
        return <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-800 border-amber-200 text-xs py-1 px-3 rounded-full font-bold">En attente d&apos;approbation</Badge>;
      case 'en_attente_paiement':
        return <Badge className="bg-blue-100 hover:bg-blue-100 text-blue-800 border-blue-200 text-xs py-1 px-3 rounded-full font-bold">En attente de paiement</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs py-1 px-3 rounded-full font-bold">{profile.statut_adhesion}</Badge>;
    }
  };

  const qrToken = profile.qr_token || profile.id;
  const verifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify-member?token=${qrToken}`
    : `https://cedp-uqo.ca/verify-member?token=${qrToken}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Navigation retour */}
      <div className="flex items-center justify-between">
        <Link 
          href="/admin/membres" 
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à l&apos;annuaire des membres
        </Link>

        {profile.statut_adhesion === 'en_attente_approbation' && (
          <Link 
            href="/admin/adhesions" 
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors"
          >
            ← Retour aux adhésions en attente
          </Link>
        )}
      </div>
      
      {/* ─── SECTION 1: BANNIÈRE D'EN-TÊTE AVEC PHOTO, STATUT, ANCIENNETÉ ET BOUTON CARTE DE MEMBRE QR ─── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md relative overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-950 via-blue-800 to-amber-500 absolute top-0 left-0 right-0" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-2">
          {/* Avatar / Photo + Identité */}
          <div className="flex items-center gap-5">
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={`${profile.prenom} ${profile.nom}`} 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-blue-100 shadow-md shrink-0" 
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-950 text-amber-400 font-extrabold text-xl sm:text-2xl flex items-center justify-center border-2 border-blue-900 shadow-md shrink-0">
                {getInitials(profile.prenom, profile.nom)}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {profile.prenom} {profile.nom}
                </h1>
                {profile.poste_association && (
                  <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-250">
                    {profile.poste_association}
                  </span>
                )}
                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-xs font-semibold capitalize">
                  {profile.categorie?.replace('_', ' ')}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {profile.email}
                </span>
                {profile.telephone && (
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    • <Phone className="w-3.5 h-3.5 text-blue-700" /> {profile.telephone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Badges Statut d'adhésion, Durée et Accès rapide Carte QR */}
          <div className="flex flex-col sm:items-end justify-between gap-2.5 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge()}
              <Badge variant="secondary" className="bg-blue-50 text-blue-950 border border-blue-100 gap-1.5 py-1 px-3 rounded-full text-xs font-bold shadow-xs">
                <Clock className="w-3.5 h-3.5 text-blue-700" />
                {getMemberDuration(profile.created_at)}
              </Badge>
            </div>

            <Button
              onClick={() => setShowQRModal(true)}
              className="bg-gradient-to-r from-blue-950 to-indigo-900 hover:from-blue-900 hover:to-indigo-850 text-amber-400 font-bold gap-2 text-xs rounded-full py-1 px-4 shadow-md h-8 border border-blue-900/60"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-400" /> Carte de membre QR
            </Button>
          </div>
        </div>
      </div>

      {/* ─── CORPS DE FICHE : GAUCHE (DOSSIER MEMBRE) & DROITE (INFORMATIONS, CARTE QR & PARAMÉTRAGE) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* COLONNE GAUCHE: FICHE ET PARCOURS DU MEMBRE */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Informations Personnelles */}
          <Card className="border-0 shadow-md rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 px-6 py-4 flex flex-row items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-800">
                <User className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Informations personnelles</CardTitle>
                <CardDescription className="text-xs text-slate-400">Coordonnées et détails généraux</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Téléphone</dt>
                  <dd className="text-slate-950 font-medium flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-slate-400" /> {formatValue(profile.telephone)}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Catégorie statutaire</dt>
                  <dd className="text-slate-950 font-bold capitalize">{profile.categorie?.replace('_', ' ')}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date d&apos;inscription</dt>
                  <dd className="text-slate-950 font-medium flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString('fr-CA', { dateStyle: 'long' }) : 'N/A'}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Localisation</dt>
                  <dd className="text-slate-950 font-medium flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {profile.ville || profile.pays ? `${profile.ville || ''}, ${profile.pays || ''}` : <span className="text-slate-400 italic">Non spécifié</span>}
                  </dd>
                </div>
                <div className="sm:col-span-2 space-y-1.5 pt-3 border-t border-slate-50">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Biographie</dt>
                  <dd className="text-slate-800 leading-relaxed bg-slate-50 rounded-xl p-4 text-xs font-medium border border-slate-100">
                    {profile.bio || <span className="text-slate-400 italic">Aucune biographie rédigée</span>}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Card 2: Parcours Académique */}
          <Card className="border-0 shadow-md rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 px-6 py-4 flex flex-row items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-800">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Parcours académique UQO</CardTitle>
                <CardDescription className="text-xs text-slate-400">Études supérieures et affiliations UQO</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Université</dt>
                  <dd className="text-slate-950 font-semibold">{formatValue(profile.universite_origine || 'Université du Québec en Outaouais (UQO)')}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Niveau d&apos;études</dt>
                  <dd className="text-slate-950 font-bold">{formatValue(profile.niveau_etudes)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Programme d&apos;études</dt>
                  <dd className="text-slate-950 font-semibold text-blue-950">{formatValue(profile.programme_etudes)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Domaine d&apos;études</dt>
                  <dd className="text-slate-950 font-medium">{formatValue(profile.domaine_etudes)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Matricule UQO</dt>
                  <dd className="text-slate-950 font-mono font-bold">{formatValue(profile.matricule_uqo)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Année diplôme / fin d&apos;études</dt>
                  <dd className="text-slate-950 font-medium">{formatValue(profile.annee_diplome)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Card 3: Parcours Professionnel */}
          <Card className="border-0 shadow-md rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 px-6 py-4 flex flex-row items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-800">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Parcours professionnel</CardTitle>
                <CardDescription className="text-xs text-slate-400">Emploi actuel, employeur et expertises</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Poste actuel</dt>
                  <dd className="text-slate-950 font-bold">{formatValue(profile.poste_actuel)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Employeur</dt>
                  <dd className="text-slate-950 font-medium">{formatValue(profile.employeur)}</dd>
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Secteur d&apos;activité</dt>
                  <dd className="text-slate-950 font-medium">{formatValue(profile.secteur_activite)}</dd>
                </div>
                
                <div className="sm:col-span-2 space-y-2 pt-3 border-t border-slate-50">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expertises & Compétences</dt>
                  <dd className="text-slate-800">
                    {profile.expertises ? (
                      <div className="flex gap-1.5 flex-wrap mt-1">
                        {profile.expertises.split(',').map((exp: string, i: number) => (
                          <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-0 text-[11px] px-2.5 py-0.5 rounded-md font-semibold">
                            {exp.trim()}
                          </Badge>
                        ))}
                      </div>
                    ) : <span className="text-slate-400 italic">Non spécifié</span>}
                  </dd>
                </div>

                <div className="sm:col-span-2 flex gap-4 pt-3 border-t border-slate-50 text-xs font-semibold">
                  {profile.linkedin_url && (
                    <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors">
                      <Globe className="w-4 h-4 text-blue-700" /> LinkedIn
                    </a>
                  )}
                  {profile.site_web && (
                    <a href={profile.site_web} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-slate-650 hover:text-slate-900 transition-colors">
                      <Globe className="w-4 h-4 text-slate-600" /> Site Web
                    </a>
                  )}
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Card 4: Parrainage & Motivation */}
          <Card className="border-0 shadow-md rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 px-6 py-4 flex flex-row items-center gap-3 bg-amber-50/40">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-950">Parrainage & Motivation</CardTitle>
                <CardDescription className="text-xs text-slate-400">Éléments fournis lors de la demande d&apos;adhésion</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Motivation / Justification de l&apos;adhésion</dt>
                <dd className="text-slate-800 bg-slate-50 p-3.5 rounded-xl text-xs font-medium leading-relaxed border border-slate-100">
                  {profile.motivation_adhesion || <span className="text-slate-400 italic">Aucune justification écrite fournie</span>}
                </dd>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parrains / Références</dt>
                  <dd className="text-slate-800 bg-slate-50 p-3 rounded-xl text-xs font-medium border border-slate-100">
                    {profile.parrains || <span className="text-slate-400 italic">Aucun parrain ou référence indiqué</span>}
                  </dd>
                </div>

                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notes complémentaires pour le CA</dt>
                  <dd className="text-slate-800 bg-slate-50 p-3 rounded-xl text-xs font-medium leading-relaxed border border-slate-100">
                    {profile.notes_adhesion || <span className="text-slate-400 italic">Aucune note complémentaire</span>}
                  </dd>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── COLONNE DROITE: STATUT DU COMPTE, CARTE QR & PARAMÉTRAGE SÉCURISÉ ─── */}
        <div className="space-y-6">
          
          {/* ─── BLOCK 1: STATUT DU COMPTE & ACTIVITÉ DE CONNEXION ─── */}
          <Card className="border-0 shadow-md rounded-2xl overflow-hidden bg-white">
            <div className="h-1.5 bg-blue-900" />
            <CardHeader className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-800" />
                <CardTitle className="text-sm font-bold text-slate-900">Statut du compte & Connexion</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-400">Informations d&apos;accès et état d&apos;inscription</CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-4 text-xs">
              {/* Statut d'adhésion */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-slate-500">Statut adhésion :</span>
                {getStatusBadge()}
              </div>

              {/* Rôle système & poste associatif */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-500">Rôle système :</span>
                  <span className="font-bold text-blue-950 capitalize">{profile.role?.replace('_', ' ')}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-500">Poste bureau :</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {profile.poste_association || primaryAssignment?.role_bureau || 'Aucun'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-500">Profil public (Annuaire) :</span>
                  <Badge variant="outline" className={`text-[10px] font-bold ${profile.profil_public ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                    {profile.profil_public ? 'Oui (Public)' : 'Non (Privé)'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-500">Notifications Email :</span>
                  <Badge variant="outline" className={`text-[10px] font-bold ${profile.notifications_email ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-amber-50 text-amber-800'}`}>
                    {profile.notifications_email ? 'Activées' : 'Désactivées'}
                  </Badge>
                </div>
              </div>

              {/* Ancienneté */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-blue-950 font-semibold">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-700" /> Ancienneté :</span>
                <span className="font-extrabold">{getMemberDuration(profile.created_at)}</span>
              </div>
            </CardContent>
          </Card>



          {/* ─── BLOCK 2: PARAMÉTRAGES ADMINISTRATIFS & ACTIONS SÉCURISÉES (DÉVERROUILLABLES) ─── */}
          <Card className="border-0 shadow-md rounded-2xl overflow-hidden bg-white">
            <div className="h-1.5 bg-amber-500" />
            <CardHeader className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-amber-700" />
                  <CardTitle className="text-sm font-bold text-slate-900">Paramétrage & Sécurité</CardTitle>
                </div>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Verrouillé
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-400">Actions d&apos;administration sécurisées</CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-5 text-xs">

              {/* 1. Édition du Rôle Système */}
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">1. Rôle d&apos;accès système</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditRoleMode(!editRoleMode)} 
                    className="h-7 text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:bg-blue-50 px-2 rounded-lg gap-1"
                  >
                    <Edit3 className="w-3 h-3" /> {editRoleMode ? 'Fermer' : 'Modifier'}
                  </Button>
                </div>

                {!editRoleMode ? (
                  <div className="p-2.5 bg-slate-50 rounded-lg text-slate-700 font-medium flex items-center justify-between border border-slate-100">
                    <span>Actuel : <strong>{profile.role?.replace('_', ' ')}</strong></span>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                ) : (
                  <div className="space-y-3 pt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="h-9 bg-white border-slate-200 text-xs rounded-lg">
                        <SelectValue placeholder="Sélectionnez un rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="membre">Membre standard</SelectItem>
                        <SelectItem value="admin_ca">Administrateur CA</SelectItem>
                        <SelectItem value="tresorier">Trésorier CA</SelectItem>
                        {currentUserRole === 'superadmin' && (
                          <SelectItem value="superadmin">Super Administrateur</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleUpdateRole} 
                      disabled={isUpdatingRole} 
                      className="w-full h-8 bg-blue-950 hover:bg-blue-900 text-white font-semibold rounded-lg text-xs"
                    >
                      {isUpdatingRole ? "Mise à jour..." : "Confirmer le rôle"}
                    </Button>
                  </div>
                )}
                {roleSuccess && <p className="text-xs text-emerald-600 font-bold text-center">Rôle mis à jour avec succès !</p>}
              </div>

              {/* 2. Édition du Poste Associatif */}
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">2. Poste de gouvernance</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditPosteMode(!editPosteMode)} 
                    className="h-7 text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:bg-amber-50 px-2 rounded-lg gap-1"
                  >
                    <Edit3 className="w-3 h-3" /> {editPosteMode ? 'Fermer' : 'Modifier'}
                  </Button>
                </div>

                {!editPosteMode ? (
                  <div className="p-2.5 bg-slate-50 rounded-lg text-slate-700 font-medium flex items-center justify-between border border-slate-100">
                    <span>Actuel : <strong>{profile.poste_association || primaryAssignment?.role_bureau || 'Aucun (Membre simple)'}</strong></span>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                ) : (
                  <div className="space-y-3 pt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <Select value={roleBureau} onValueChange={setRoleBureau}>
                      <SelectTrigger className="h-9 bg-white border-slate-200 text-xs rounded-lg">
                        <SelectValue placeholder="Sélectionnez un poste" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aucun">Aucun (Membre simple)</SelectItem>
                        <SelectItem value="president">Président</SelectItem>
                        <SelectItem value="vice_president">Vice-Président</SelectItem>
                        <SelectItem value="secretaire">Secrétaire</SelectItem>
                        <SelectItem value="tresorier">Trésorier</SelectItem>
                        <SelectItem value="responsable_comm">Responsable Communication</SelectItem>
                        <SelectItem value="responsable_partenariat">Responsable Partenariats</SelectItem>
                        <SelectItem value="administrateur_ca">Administrateur CA</SelectItem>
                        <SelectItem value="conseiller">Conseiller</SelectItem>
                        <SelectItem value="charge_dossier">Responsable de dossiers</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input 
                      placeholder="Précision de titre (ex: Conseiller PR)" 
                      value={titrePersonnalise} 
                      onChange={(e) => setTitrePersonnalise(e.target.value)} 
                      className="h-8 bg-white border-slate-200 text-xs rounded-lg"
                    />
                    <Button 
                      onClick={handleUpdatePoste} 
                      disabled={isUpdatingPoste} 
                      className="w-full h-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs"
                    >
                      {isUpdatingPoste ? "Enregistrement..." : "Confirmer le poste"}
                    </Button>
                  </div>
                )}
                {posteSuccess && <p className="text-xs text-emerald-600 font-bold text-center">Poste mis à jour avec succès !</p>}
              </div>

              {/* 3. Actions sur le statut du compte */}
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">3. Suspension / Activation</span>
                {profile.statut_adhesion === 'approuve' ? (
                  <Button 
                    variant="destructive" 
                    onClick={() => handleStatusChange(true)} 
                    disabled={isUpdatingStatus}
                    className="w-full h-9 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <UserX className="w-3.5 h-3.5" /> Suspendre l&apos;accès du membre
                  </Button>
                ) : profile.statut_adhesion === 'suspendu' ? (
                  <Button 
                    variant="default" 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-9 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm"
                    onClick={() => handleStatusChange(false)} 
                    disabled={isUpdatingStatus}
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Réactiver le compte membre
                  </Button>
                ) : (
                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex items-start gap-2 text-amber-900 leading-normal">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>Statut <strong>{profile.statut_adhesion}</strong>. L&apos;approbation s&apos;effectue dans la page des adhésions.</span>
                  </div>
                )}
              </div>

              {/* 4. Réinitialisation Mot de passe */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">4. Mot de passe d&apos;accès</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditPasswordMode(!editPasswordMode)} 
                    className="h-7 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2 rounded-lg gap-1"
                  >
                    <Key className="w-3 h-3" /> {editPasswordMode ? 'Fermer' : 'Définir un mot de passe'}
                  </Button>
                </div>

                {editPasswordMode && (
                  <div className="space-y-2 pt-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <Input 
                      type="password" 
                      placeholder="Nouveau mot de passe" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-8 bg-white border-slate-200 text-xs rounded-lg"
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleResetPassword} 
                      disabled={isUpdatingPassword || !newPassword}
                      className="w-full h-8 font-semibold rounded-lg text-xs border-slate-300 text-slate-800 hover:bg-white"
                    >
                      {isUpdatingPassword ? "Mise à jour..." : "Réinitialiser le mot de passe"}
                    </Button>
                  </div>
                )}
                {passwordSuccess && <p className="text-xs text-emerald-600 font-bold text-center">Mot de passe mis à jour !</p>}
              </div>

              {/* 5. Danger Zone (Superadmin uniquement) */}
              {currentUserRole === 'superadmin' && (
                <div className="pt-3 border-t border-red-100 space-y-2">
                  <span className="font-extrabold text-red-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-red-650" /> Zone de danger (Superadmin)
                  </span>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteMember} 
                    disabled={isDeleting}
                    className="w-full h-9 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 bg-red-650 hover:bg-red-700 text-white shadow-sm"
                  >
                    {isDeleting ? "Suppression en cours..." : "Supprimer définitivement ce membre"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── MODAL CARTE DE MEMBRE NUMÉRIQUE & QR CODE ─── */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="rounded-3xl p-6 bg-slate-950 border border-slate-800 max-w-lg shadow-2xl">
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="text-lg font-bold text-white flex items-center justify-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-400" /> Carte de membre virtuelle officielle
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Aperçu de la carte de membre et du QR Code de vérification
            </DialogDescription>
          </DialogHeader>

          <MemberCardQR
            prenom={profile.prenom}
            nom={profile.nom}
            email={profile.email}
            categorie={profile.categorie}
            statut_adhesion={profile.statut_adhesion}
            qr_token={qrToken}
            date_expiration_adhesion={profile.date_expiration_adhesion}
            badgeStatus={profile.statut_adhesion === 'approuve' ? 'valide' : 'invalide'}
          />

          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => setShowQRModal(false)}
              className="bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs rounded-xl"
            >
              Fermer la carte
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
