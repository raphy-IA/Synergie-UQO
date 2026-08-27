'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ProfileSchema = z.object({
  prenom: z.string().min(2, { message: "Le prénom doit faire au moins 2 caractères" }),
  nom: z.string().min(2, { message: "Le nom doit faire au moins 2 caractères" }),
  telephone: z.string().optional().or(z.literal('')),
  bio: z.string().optional().or(z.literal('')),
  linkedin_url: z.string().url({ message: "URL LinkedIn invalide" }).optional().or(z.literal('')),
});

export async function updateProfile(formData: any) {
  const result = ProfileSchema.safeParse(formData);

  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  const { prenom, nom, telephone, bio, linkedin_url } = result.data;

  const { error } = await supabase
    .from('profiles')
    .update({
      prenom,
      nom,
      telephone: telephone || null,
      bio: bio || null,
      linkedin_url: linkedin_url || null,
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
