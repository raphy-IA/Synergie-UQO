'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { updateProfile } from '@/app/actions/profile';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ProfileFormProps {
  initialProfile: {
    prenom: string;
    nom: string;
    telephone: string | null;
    bio: string | null;
    linkedin_url: string | null;
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
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

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
    <Card className="max-w-2xl mx-auto shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl text-slate-900">Mettre à jour mon profil</CardTitle>
        <CardDescription>
          Complétez ou modifiez vos informations personnelles affichées sur votre profil.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom</Label>
              <Input id="prenom" {...register('prenom')} />
              {errors.prenom && <p className="text-xs text-red-500">{errors.prenom.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input id="nom" {...register('nom')} />
              {errors.nom && <p className="text-xs text-red-500">{errors.nom.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telephone">Téléphone</Label>
            <Input id="telephone" placeholder="819-555-1234" {...register('telephone')} />
            {errors.telephone && <p className="text-xs text-red-500">{errors.telephone.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin_url">URL Profil LinkedIn</Label>
            <Input id="linkedin_url" placeholder="https://linkedin.com/in/..." {...register('linkedin_url')} />
            {errors.linkedin_url && <p className="text-xs text-red-500">{errors.linkedin_url.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biographie / Compétences</Label>
            <textarea
              id="bio"
              rows={4}
              {...register('bio')}
              placeholder="Décrivez votre parcours académique, vos compétences clés ou votre projet professionnel..."
              className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            />
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
