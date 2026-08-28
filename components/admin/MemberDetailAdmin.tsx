'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { updateMemberRole, updateMemberPoste, suspendMember, reactivateMember, adminResetPassword, deleteMember } from '@/app/actions/admin';
import { 
  User, GraduationCap, Briefcase, Calendar, ShieldCheck, Mail, Phone, MapPin, 
  Globe, Key, UserCheck, UserX, AlertTriangle, ArrowLeft, Trash2 
} from 'lucide-react';

export default function MemberDetailAdmin({ profile, currentUserRole = 'membre' }: { profile: any; currentUserRole?: string }) {
  const router = useRouter();
  
  // State for Role
  const [role, setRole] = useState(profile.role || 'membre');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [roleSuccess, setRoleSuccess] = useState(false);
  
  // State for Poste
  const [poste, setPoste] = useState(profile.poste_association || '');
  const [dateDebut, setDateDebut] = useState(profile.date_debut_mandat || '');
  const [dateFin, setDateFin] = useState(profile.date_fin_mandat || '');
  const [isUpdatingPoste, setIsUpdatingPoste] = useState(false);
  const [posteSuccess, setPosteSuccess] = useState(false);
  
  // State for Password
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  
  // State for Status
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdateRole = async () => {
    setIsUpdatingRole(true);
    setRoleSuccess(false);
    try {
      await updateMemberRole(profile.id, role);
      setRoleSuccess(true);
      setTimeout(() => setRoleSuccess(false), 3000);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleUpdatePoste = async () => {
    setIsUpdatingPoste(true);
    setPosteSuccess(false);
    try {
      await updateMemberPoste(profile.id, poste, dateDebut, dateFin);
      setPosteSuccess(true);
      setTimeout(() => setPosteSuccess(false), 3000);
      router.refresh();
    } catch (e) {
      console.error(e);
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

  // Determiner le statut de l'adhésion pour la couleur du badge
  const getStatusBadge = () => {
    switch (profile.statut_adhesion) {
      case 'approuve':
        return <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-800 border-emerald-200 text-sm py-1 px-3.5 rounded-full font-bold">Actif (Approuvé)</Badge>;
      case 'suspendu':
        return <Badge variant="destructive" className="text-sm py-1 px-3.5 rounded-full font-bold">Suspendu</Badge>;
      case 'en_attente_approbation':
        return <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-800 border-amber-200 text-sm py-1 px-3.5 rounded-full font-bold">En attente d&apos;approbation</Badge>;
      case 'en_attente_paiement':
        return <Badge className="bg-blue-100 hover:bg-blue-100 text-blue-800 border-blue-200 text-sm py-1 px-3.5 rounded-full font-bold">En attente de paiement</Badge>;
      default:
        return <Badge variant="secondary" className="text-sm py-1 px-3.5 rounded-full font-bold">{profile.statut_adhesion}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Navigation retour */}
      <div className="flex items-center justify-between">
        <Link 
          href="/admin/membres" 
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à l&apos;annuaire
        </Link>

        {profile.statut_adhesion === 'en_attente_approbation' && (
          <Link 
            href="/admin/adhesions" 
            className="inline-flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 transition-colors font-medium"
          >
            ← Retour aux adhésions en attente
          </Link>
        )}
      </div>
      
      {/* Header Fiche Membre */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7 text-blue-900" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold text-slate-900">{profile.prenom} {profile.nom}</h1>
              {profile.poste_association && (
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-250">
                  {profile.poste_association}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-slate-400" /> {profile.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Columns - Detailed Info Cards */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Informations Personnelles */}
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 px-6 py-5 flex flex-row items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-800" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-950">Informations personnelles</CardTitle>
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
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString('fr-CA') : 'N/A'}
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
                  <dd className="text-slate-800 leading-relaxed bg-slate-50 rounded-xl p-4 text-xs font-medium">
                    {profile.bio || <span className="text-slate-400 italic">Aucune biographie rédigée</span>}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Card 2: Parcours Académique */}
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 px-6 py-5 flex flex-row items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-blue-800" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-950">Parcours académique</CardTitle>
                <CardDescription className="text-xs text-slate-400">Études supérieures et affiliations UQO</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Université</dt>
                  <dd className="text-slate-950 font-medium">{formatValue(profile.universite_origine || 'UQO')}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Niveau d&apos;études</dt>
                  <dd className="text-slate-950 font-bold">{formatValue(profile.niveau_etudes)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Programme</dt>
                  <dd className="text-slate-950 font-medium">{formatValue(profile.programme_etudes)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Domaine d&apos;études</dt>
                  <dd className="text-slate-950 font-medium">{formatValue(profile.domaine_etudes)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Matricule UQO</dt>
                  <dd className="text-slate-950 font-mono font-medium">{formatValue(profile.matricule_uqo)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Année diplôme</dt>
                  <dd className="text-slate-950 font-medium">{formatValue(profile.annee_diplome)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Card 3: Parcours Professionnel */}
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 px-6 py-5 flex flex-row items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-blue-800" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-950">Parcours professionnel</CardTitle>
                <CardDescription className="text-xs text-slate-400">Emploi actuel et compétences</CardDescription>
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
        </div>

        {/* Right Column - Admin Actions Sidebar */}
        <div className="space-y-6">
          
          {/* Card: Rôle Système */}
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white">
            <div className="h-1 bg-blue-900" />
            <CardHeader className="px-6 py-5 pb-2">
              <CardTitle className="text-sm font-bold text-slate-900">Rôle d&apos;accès système</CardTitle>
              <CardDescription className="text-xs text-slate-400">Contrôle les droits de connexion</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-6">
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-10 bg-slate-50 border-slate-200 rounded-lg">
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
                className="w-full bg-blue-950 hover:bg-blue-900 text-white font-semibold rounded-lg shadow-sm"
              >
                {isUpdatingRole ? "Mise à jour..." : "Enregistrer le rôle"}
              </Button>
              {roleSuccess && (
                <p className="text-xs text-emerald-600 font-bold text-center">Rôle mis à jour !</p>
              )}
            </CardContent>
          </Card>

          {/* Card: Poste Associatif */}
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white">
            <div className="h-1 bg-amber-500" />
            <CardHeader className="px-6 py-5 pb-2">
              <CardTitle className="text-sm font-bold text-slate-900">Poste associatif</CardTitle>
              <CardDescription className="text-xs text-slate-400">Rôle officiel au sein du CA / association</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-6">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Titre officiel</label>
                <Input 
                  placeholder="ex: Président, Secrétaire..." 
                  value={poste} 
                  onChange={(e) => setPoste(e.target.value)} 
                  className="h-10 bg-slate-50 border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Date début</label>
                  <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="h-9 bg-slate-50 border-slate-200 text-xs rounded-lg px-2" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Date fin</label>
                  <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="h-9 bg-slate-50 border-slate-200 text-xs rounded-lg px-2" />
                </div>
              </div>
              <Button 
                onClick={handleUpdatePoste} 
                disabled={isUpdatingPoste} 
                className="w-full bg-slate-900 hover:bg-slate-850 text-white font-semibold rounded-lg shadow-sm"
              >
                {isUpdatingPoste ? "Enregistrement..." : "Enregistrer le poste"}
              </Button>
              {posteSuccess && (
                <p className="text-xs text-emerald-600 font-bold text-center">Poste enregistré !</p>
              )}
            </CardContent>
          </Card>

          {/* Card: Statut Adhésion */}
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white">
            <div className="h-1 bg-slate-900" />
            <CardHeader className="px-6 py-5 pb-2">
              <CardTitle className="text-sm font-bold text-slate-900">Statut du compte</CardTitle>
              <CardDescription className="text-xs text-slate-400">Gérer l&apos;approbation ou la suspension</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {profile.statut_adhesion === 'approuve' ? (
                <Button 
                  variant="destructive" 
                  onClick={() => handleStatusChange(true)} 
                  disabled={isUpdatingStatus}
                  className="w-full h-10 font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <UserX className="w-4 h-4" /> Suspendre le membre
                </Button>
              ) : profile.statut_adhesion === 'suspendu' ? (
                <Button 
                  variant="default" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-10 font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
                  onClick={() => handleStatusChange(false)} 
                  disabled={isUpdatingStatus}
                >
                  <UserCheck className="w-4 h-4" /> Réactiver le membre
                </Button>
              ) : (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800 leading-normal">
                    La demande de ce membre est actuellement en statut <strong className="underline">{profile.statut_adhesion}</strong>. Vous pouvez l&apos;approuver depuis la page des adhésions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: Réinitialisation Password */}
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white">
            <div className="h-1 bg-red-650" />
            <CardHeader className="px-6 py-5 pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-500" /> Réinitialiser mot de passe
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">Définir un nouveau mot de passe d&apos;accès</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-6">
              <Input 
                type="password" 
                placeholder="Nouveau mot de passe" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-10 bg-slate-50 border-slate-200 rounded-lg"
              />
              <Button 
                variant="outline" 
                onClick={handleResetPassword} 
                disabled={isUpdatingPassword || !newPassword}
                className="w-full h-10 font-semibold rounded-lg hover:bg-slate-50 border-slate-200 text-slate-700 transition-colors"
              >
                {isUpdatingPassword ? "Mise à jour..." : "Réinitialiser"}
              </Button>
              {passwordSuccess && (
                <p className="text-xs text-emerald-600 font-bold text-center">Mot de passe réinitialisé !</p>
              )}
            </CardContent>
          </Card>

          {/* Card: Danger Zone / Suppression (Super Utilisateur uniquement) */}
          {currentUserRole === 'superadmin' && (
            <Card className="border border-red-100 shadow-lg rounded-2xl overflow-hidden bg-red-50/20">
              <div className="h-1 bg-red-600" />
              <CardHeader className="px-6 py-5 pb-2">
                <CardTitle className="text-sm font-bold text-red-950 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-650" /> Danger Zone
                </CardTitle>
                <CardDescription className="text-xs text-red-700/75">Actions irréversibles sur le compte</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <p className="text-xs text-red-800/80 mb-4 leading-relaxed">
                  La suppression supprimera définitivement le profil de ce membre de l&apos;annuaire, de la base de données et révoquera immédiatement tous ses accès au portail.
                </p>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteMember} 
                  disabled={isDeleting}
                  className="w-full h-10 font-bold rounded-lg flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-900/10"
                >
                  {isDeleting ? "Suppression en cours..." : "Supprimer définitivement le membre"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
