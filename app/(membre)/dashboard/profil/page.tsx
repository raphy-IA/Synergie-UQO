import React from 'react';
import { createClient } from '@/lib/supabase/server';
import ProfileForm from '@/components/dashboard/ProfileForm';

export const dynamic = 'force-dynamic';

export default async function ProfilPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('prenom, nom, telephone, bio, linkedin_url, site_web, ville, pays, programme_etudes, niveau_etudes, domaine_etudes, annee_diplome, universite_origine, poste_actuel, employeur, secteur_activite, expertises, notifications_email, profil_public, categorie, avatar_url')
    .eq('id', user!.id)
    .single();

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-blue-950">Mon Espace Profil</h1>
        <p className="text-slate-650 text-sm">Gérez vos informations personnelles, préférences et la sécurité de votre compte.</p>
      </div>

      <ProfileForm initialProfile={profile} />
    </div>
  );
}
