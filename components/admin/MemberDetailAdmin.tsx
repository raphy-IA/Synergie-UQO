'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { updateMemberRole, updateMemberPoste, suspendMember, reactivateMember, adminResetPassword } from '@/app/actions/admin';

export default function MemberDetailAdmin({ profile }: { profile: any }) {
  const router = useRouter();
  
  // State for Role
  const [role, setRole] = useState(profile.role || 'membre');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  
  // State for Poste
  const [poste, setPoste] = useState(profile.poste_association || '');
  const [dateDebut, setDateDebut] = useState(profile.date_debut_mandat || '');
  const [dateFin, setDateFin] = useState(profile.date_fin_mandat || '');
  const [isUpdatingPoste, setIsUpdatingPoste] = useState(false);
  
  // State for Password
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  // State for Status
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleUpdateRole = async () => {
    setIsUpdatingRole(true);
    try {
      await updateMemberRole(profile.id, role);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleUpdatePoste = async () => {
    setIsUpdatingPoste(true);
    try {
      await updateMemberPoste(profile.id, poste, dateDebut, dateFin);
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
    try {
      await adminResetPassword(profile.id, newPassword);
      setNewPassword('');
      alert('Mot de passe mis à jour avec succès');
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la mise à jour du mot de passe');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const formatValue = (val: any) => val || <span className="text-gray-400 italic">Non spécifié</span>;

  return (
    <div className="space-y-6">
      <Link href="/admin/membres" className="text-blue-600 hover:underline mb-4 inline-block">
        &larr; Retour à l'annuaire
      </Link>
      
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{profile.prenom} {profile.nom}</h1>
          <p className="text-slate-500">{profile.email}</p>
        </div>
        <Badge variant={profile.statut_adhesion === 'approuve' ? 'default' : profile.statut_adhesion === 'suspendu' ? 'destructive' : 'secondary'} className="text-lg py-1 px-3">
          {profile.statut_adhesion}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations Personnelles</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatValue(profile.telephone)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Catégorie</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatValue(profile.categorie)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Date d'inscription</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString('fr-CA') : 'N/A'}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Biographie</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatValue(profile.bio)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parcours Académique</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Université</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatValue(profile.universite)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Programme</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatValue(profile.programme_etudes)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Niveau d'études</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatValue(profile.niveau_etudes)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Domaine d'études</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatValue(profile.domaine_etudes)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parcours Professionnel</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Employeur Actuel</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatValue(profile.employeur_actuel)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Poste Actuel</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatValue(profile.poste_actuel)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Secteur d'activité</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatValue(profile.secteur_activite)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Expertises</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {profile.expertises && profile.expertises.length > 0 ? (
                      <div className="flex gap-2 flex-wrap mt-2">
                        {profile.expertises.map((exp: string, i: number) => (
                          <Badge key={i} variant="outline">{exp}</Badge>
                        ))}
                      </div>
                    ) : <span className="text-gray-400 italic">Non spécifié</span>}
                  </dd>
                </div>
                <div className="sm:col-span-2 flex gap-4 mt-2">
                  {profile.linkedin_url && (
                    <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">LinkedIn</a>
                  )}
                  {profile.site_web && (
                    <a href={profile.site_web} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Site Web</a>
                  )}
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Admin Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rôle système</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="membre">Membre</SelectItem>
                  <SelectItem value="admin_ca">Admin CA</SelectItem>
                  <SelectItem value="tresorier">Trésorier</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleUpdateRole} disabled={isUpdatingRole} className="w-full">
                Mettre à jour le rôle
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Poste associatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Titre du poste</label>
                <Input 
                  placeholder="ex: président, trésorier..." 
                  value={poste} 
                  onChange={(e) => setPoste(e.target.value)} 
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Début</label>
                  <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Fin</label>
                  <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleUpdatePoste} disabled={isUpdatingPoste} className="w-full">
                Enregistrer
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statut du compte</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.statut_adhesion === 'approuve' ? (
                <Button 
                  variant="destructive" 
                  onClick={() => handleStatusChange(true)} 
                  disabled={isUpdatingStatus}
                  className="w-full"
                >
                  Suspendre le membre
                </Button>
              ) : profile.statut_adhesion === 'suspendu' ? (
                <Button 
                  variant="default" 
                  className="bg-green-600 hover:bg-green-700 w-full"
                  onClick={() => handleStatusChange(false)} 
                  disabled={isUpdatingStatus}
                >
                  Réactiver le membre
                </Button>
              ) : (
                <p className="text-sm text-gray-500 text-center">
                  Le statut est actuellement <strong>{profile.statut_adhesion}</strong>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Réinitialiser le mot de passe</CardTitle>
              <CardDescription>Définir un nouveau mot de passe pour cet utilisateur.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                type="password" 
                placeholder="Nouveau mot de passe" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Button 
                variant="outline" 
                onClick={handleResetPassword} 
                disabled={isUpdatingPassword || !newPassword}
                className="w-full"
              >
                Réinitialiser
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
