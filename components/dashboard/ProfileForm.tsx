'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { updateProfile } from '@/app/actions/profile';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ProfileFormProps {
  initialProfile: {
    prenom: string;
    nom: string;
    telephone: string | null;
    bio: string | null;
    linkedin_url: string | null;
    site_web: string | null;
    ville: string | null;
    pays: string | null;
    programme_etudes: string | null;
    niveau_etudes: string | null;
    domaine_etudes: string | null;
    annee_diplome: number | null;
    universite_origine: string | null;
    poste_actuel: string | null;
    employeur: string | null;
    secteur_activite: string | null;
    expertises: string | null;
    notifications_email: boolean | null;
    profil_public: boolean | null;
    categorie: string | null;
  };
}

export default function ProfileForm({ initialProfile }: ProfileFormProps) {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      prenom: initialProfile.prenom || '',
      nom: initialProfile.nom || '',
      telephone: initialProfile.telephone || '',
      bio: initialProfile.bio || '',
      linkedin_url: initialProfile.linkedin_url || '',
      site_web: initialProfile.site_web || '',
      ville: initialProfile.ville || '',
      pays: initialProfile.pays || '',
      programme_etudes: initialProfile.programme_etudes || '',
      niveau_etudes: initialProfile.niveau_etudes || '',
      domaine_etudes: initialProfile.domaine_etudes || '',
      annee_diplome: initialProfile.annee_diplome || '',
      universite_origine: initialProfile.universite_origine || '',
      poste_actuel: initialProfile.poste_actuel || '',
      employeur: initialProfile.employeur || '',
      secteur_activite: initialProfile.secteur_activite || '',
      expertises: initialProfile.expertises || '',
      notifications_email: initialProfile.notifications_email ?? true,
      profil_public: initialProfile.profil_public ?? false,
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Convert annee_diplome to number if provided
    if (data.annee_diplome) {
      data.annee_diplome = parseInt(data.annee_diplome, 10);
    } else {
      data.annee_diplome = null;
    }

    try {
      const res = await updateProfile(data);
      if (res?.error) {
        if (typeof res.error === 'string') {
          setErrorMsg(res.error);
        } else {
          setErrorMsg("Veuillez vérifier les champs du formulaire.");
        }
      } else if (res?.success) {
        setSuccessMsg("Votre profil a été mis à jour avec succès !");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl text-slate-900">Mettre à jour mon profil</CardTitle>
        <CardDescription>
          Complétez ou modifiez vos informations personnelles affichées sur votre profil.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-8">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Informations personnelles */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Informations personnelles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <Input id="prenom" {...register('prenom', { required: "Ce champ est requis" })} />
                {errors.prenom && <p className="text-xs text-red-500">{errors.prenom.message as string}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input id="nom" {...register('nom', { required: "Ce champ est requis" })} />
                {errors.nom && <p className="text-xs text-red-500">{errors.nom.message as string}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input id="telephone" placeholder="819-555-1234" {...register('telephone')} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ville">Ville</Label>
                <Input id="ville" {...register('ville')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pays">Pays</Label>
                <Input id="pays" {...register('pays')} />
              </div>
            </div>
          </div>

          {/* Section 2: Parcours académique */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Parcours académique</h3>
            <div className="space-y-2">
              <Label htmlFor="programme_etudes">Programme d'études</Label>
              <Input id="programme_etudes" {...register('programme_etudes')} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="niveau_etudes">Niveau d'études</Label>
              <select 
                id="niveau_etudes" 
                {...register('niveau_etudes')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Sélectionnez un niveau</option>
                <option value="Certificat">Certificat</option>
                <option value="Baccalauréat">Baccalauréat</option>
                <option value="DESS">DESS</option>
                <option value="Maîtrise">Maîtrise</option>
                <option value="Doctorat">Doctorat</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="domaine_etudes">Domaine d'études</Label>
              <Input id="domaine_etudes" {...register('domaine_etudes')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="annee_diplome">Année d'obtention du diplôme</Label>
              <Input id="annee_diplome" type="number" {...register('annee_diplome')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="universite_origine">Université d'origine (si applicable)</Label>
              <Input id="universite_origine" {...register('universite_origine')} />
            </div>
          </div>

          {/* Section 3: Parcours professionnel */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Parcours professionnel</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="poste_actuel">Poste actuel</Label>
                <Input id="poste_actuel" {...register('poste_actuel')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeur">Employeur</Label>
                <Input id="employeur" {...register('employeur')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secteur_activite">Secteur d'activité</Label>
              <Input id="secteur_activite" {...register('secteur_activite')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expertises">Expertises</Label>
              <textarea
                id="expertises"
                rows={3}
                {...register('expertises')}
                placeholder="Décrivez vos compétences clés..."
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">URL Profil LinkedIn</Label>
                <Input id="linkedin_url" placeholder="https://linkedin.com/in/..." {...register('linkedin_url')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_web">Site Web</Label>
                <Input id="site_web" placeholder="https://..." {...register('site_web')} />
              </div>
            </div>
          </div>

          {/* Section 4: Biographie */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Biographie</h3>
            <div className="space-y-2">
              <Label htmlFor="bio">Biographie</Label>
              <textarea
                id="bio"
                rows={4}
                {...register('bio')}
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>
          </div>

          {/* Section 5: Préférences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Préférences</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox id="notifications_email" {...register('notifications_email')} />
              <Label htmlFor="notifications_email" className="font-normal cursor-pointer">
                Recevoir des notifications par courriel
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="profil_public" {...register('profil_public')} />
              <Label htmlFor="profil_public" className="font-normal cursor-pointer">
                Rendre mon profil visible dans l'annuaire public
              </Label>
            </div>
          </div>

        </CardContent>
        <CardFooter className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={isLoading} className="bg-slate-900 hover:bg-slate-950 text-white">
            {isLoading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

