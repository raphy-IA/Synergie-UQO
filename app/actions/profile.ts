'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ProfileSchema = z.object({
  prenom: z.string().min(2, { message: "Le prénom doit faire au moins 2 caractères" }),
  nom: z.string().min(2, { message: "Le nom doit faire au moins 2 caractères" }),
  telephone: z.string().optional().or(z.literal('')),
  bio: z.string().optional().or(z.literal('')),
  linkedin_url: z.string().optional().or(z.literal('')),
  site_web: z.string().optional().or(z.literal('')),
  ville: z.string().optional().or(z.literal('')),
  pays: z.string().optional().or(z.literal('')),
  programme_etudes: z.string().optional().or(z.literal('')),
  niveau_etudes: z.string().optional().or(z.literal('')),
  domaine_etudes: z.string().optional().or(z.literal('')),
  annee_diplome: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.coerce.number().optional()
  ),
  universite_origine: z.string().optional().or(z.literal('')),
  poste_actuel: z.string().optional().or(z.literal('')),
  employeur: z.string().optional().or(z.literal('')),
  secteur_activite: z.string().optional().or(z.literal('')),
  expertises: z.string().optional().or(z.literal('')),
  notifications_email: z.boolean().optional(),
  profil_public: z.boolean().optional(),
  avatar_url: z.string().optional().or(z.literal('')),
});

export async function updateProfile(formData: any) {
  const result = ProfileSchema.safeParse(formData);

  if (!result.success) {
    console.error('Validation errors in updateProfile:', result.error.format());
    const fieldErrors = result.error.flatten().fieldErrors as any;
    const firstErrorField = Object.keys(fieldErrors)[0];
    const firstErrorMessage = fieldErrors[firstErrorField]?.[0] || '';
    return { error: `Erreur dans le champ '${firstErrorField}': ${firstErrorMessage}` };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  const {
    prenom, nom, telephone, bio, linkedin_url, site_web, ville, pays,
    programme_etudes, niveau_etudes, domaine_etudes, annee_diplome,
    universite_origine, poste_actuel, employeur, secteur_activite,
    expertises, notifications_email, profil_public, avatar_url
  } = result.data;

  const { error } = await supabase
    .from('profiles')
    .update({
      prenom,
      nom,
      telephone: telephone || null,
      bio: bio || null,
      linkedin_url: linkedin_url || null,
      site_web: site_web || null,
      ville: ville || null,
      pays: pays || null,
      programme_etudes: programme_etudes || null,
      niveau_etudes: niveau_etudes || null,
      domaine_etudes: domaine_etudes || null,
      annee_diplome: annee_diplome || null,
      universite_origine: universite_origine || null,
      poste_actuel: poste_actuel || null,
      employeur: employeur || null,
      secteur_activite: secteur_activite || null,
      expertises: expertises || null,
      notifications_email: notifications_email ?? true,
      profil_public: profil_public ?? false,
      avatar_url: avatar_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('Error updating profile:', error);
    return { error: "Erreur lors de la mise à jour du profil." };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/profil');
  return { success: true };
}

export async function changePassword(formData: any) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { error: "Non authentifié." };
  }

  const currentPassword = formData.currentPassword;
  const newPassword = formData.newPassword;

  if (!currentPassword || !newPassword) {
    return { error: "Les mots de passe sont requis." };
  }

  // Verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { error: "L'ancien mot de passe est incorrect." };
  }

  // Update to new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { error: "Erreur lors du changement de mot de passe." };
  }

  return { success: true };
}
