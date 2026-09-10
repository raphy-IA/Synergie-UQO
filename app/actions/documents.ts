'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const FolderSchema = z.object({
  nom: z.string().min(2, "Le nom du dossier doit comporter au moins 2 caractères"),
  description: z.string().optional().or(z.literal('')),
  parent_id: z.string().optional().nullable(),
  icone: z.string().optional(),
  couleur: z.string().optional(),
  visibilite_defaut: z.enum(['public', 'membres', 'participants', 'commission', 'bureau_ca']).optional(),
  commission_id: z.string().optional().nullable(),
});

const DocumentSchema = z.object({
  titre: z.string().min(2, "Le titre doit comporter au moins 2 caractères"),
  description: z.string().optional().or(z.literal('')),
  file_url: z.string().min(1, "L'URL ou le fichier est requis"),
  folder_id: z.string().optional().nullable(),
  categorie: z.string().optional(),
  visibilite: z.enum(['public', 'membres', 'participants', 'commission', 'bureau_ca']).optional(),
  commission_id: z.string().optional().nullable(),
  evenement_id: z.string().optional().nullable(),
  reunion_id: z.string().optional().nullable(),
  tache_id: z.string().optional().nullable(),
  taille_octets: z.number().optional().nullable(),
  extension: z.string().optional().nullable(),
});

/**
 * Créer un nouveau dossier dans la bibliothèque
 */
export async function createDocumentFolder(formData: any) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  // Check admin role
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!prof || !['admin_ca', 'tresorier', 'superadmin'].includes(prof.role)) {
    return { error: "Permission refusée. Seuls les administrateurs peuvent créer des dossiers." };
  }

  const result = FolderSchema.safeParse(formData);
  if (!result.success) {
    return { error: "Données du dossier invalides." };
  }

  const { nom, description, parent_id, icone, couleur, visibilite_defaut, commission_id } = result.data;
  const slug = nom.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

  const { data, error } = await supabase
    .from('document_folders')
    .insert({
      nom,
      description: description || null,
      parent_id: parent_id || null,
      slug,
      icone: icone || 'folder',
      couleur: couleur || 'blue',
      visibilite_defaut: visibilite_defaut || 'membres',
      commission_id: commission_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating folder:', error);
    return { error: "Erreur lors de la création du dossier." };
  }

  revalidatePath('/dashboard/documents');
  revalidatePath('/admin/configuration');
  return { success: true, folder: data };
}

/**
 * Mettre à jour un dossier
 */
export async function updateDocumentFolder(folderId: string, formData: any) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!prof || !['admin_ca', 'tresorier', 'superadmin'].includes(prof.role)) {
    return { error: "Permission refusée." };
  }

  const result = FolderSchema.partial().safeParse(formData);
  if (!result.success) {
    return { error: "Champs invalides." };
  }

  const { error } = await supabase
    .from('document_folders')
    .update({
      ...result.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', folderId);

  if (error) {
    console.error('Error updating folder:', error);
    return { error: "Erreur lors de la mise à jour du dossier." };
  }

  revalidatePath('/dashboard/documents');
  return { success: true };
}

/**
 * Supprimer un dossier personnalisé (non système)
 */
export async function deleteDocumentFolder(folderId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!prof || !['admin_ca', 'tresorier', 'superadmin'].includes(prof.role)) {
    return { error: "Permission refusée." };
  }

  // Vérifier si c'est un dossier système
  const { data: folder } = await supabase.from('document_folders').select('est_systeme').eq('id', folderId).single();
  if (folder?.est_systeme) {
    return { error: "Les dossiers système généraux ne peuvent pas être supprimés." };
  }

  const { error } = await supabase.from('document_folders').delete().eq('id', folderId);

  if (error) {
    console.error('Error deleting folder:', error);
    return { error: "Erreur lors de la suppression du dossier." };
  }

  revalidatePath('/dashboard/documents');
  return { success: true };
}

/**
 * Créer ou Uploader un Document avec Droits de visibilité explicites
 */
export async function saveDocument(formData: any) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const result = DocumentSchema.safeParse(formData);
  if (!result.success) {
    console.error('Validation error document:', result.error.flatten());
    return { error: "Informations du document incomplètes ou invalides." };
  }

  const {
    titre, description, file_url, folder_id, categorie,
    visibilite, commission_id, evenement_id, reunion_id, tache_id,
    taille_octets, extension
  } = result.data;

  const est_public = visibilite === 'public';

  const { data, error } = await supabase
    .from('documents')
    .insert({
      titre,
      description: description || null,
      file_url,
      folder_id: folder_id || null,
      categorie: categorie || 'autre',
      visibilite: visibilite || 'membres',
      est_public,
      commission_id: commission_id || null,
      evenement_id: evenement_id || null,
      reunion_id: reunion_id || null,
      tache_id: tache_id || null,
      taille_octets: taille_octets || null,
      extension: extension || null,
      cree_par: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting document:', error);
    return { error: "Erreur lors de l'enregistrement du document." };
  }

  revalidatePath('/dashboard/documents');
  return { success: true, document: data };
}

/**
 * Mettre à jour la visibilité ou le dossier d'un document existant
 */
export async function updateDocumentVisibilityAndFolder(docId: string, params: { visibilite?: string; folder_id?: string | null }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!prof || !['admin_ca', 'tresorier', 'superadmin'].includes(prof.role)) {
    return { error: "Permission refusée." };
  }

  const payload: any = {};
  if (params.visibilite) {
    payload.visibilite = params.visibilite;
    payload.est_public = params.visibilite === 'public';
  }
  if (params.folder_id !== undefined) {
    payload.folder_id = params.folder_id;
  }

  const { error } = await supabase.from('documents').update(payload).eq('id', docId);

  if (error) {
    console.error('Error updating document visibility:', error);
    return { error: "Erreur lors de la mise à jour des droits du document." };
  }

  revalidatePath('/dashboard/documents');
  return { success: true };
}

/**
 * Supprimer un document
 */
export async function deleteDocument(docId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!prof || !['admin_ca', 'tresorier', 'superadmin'].includes(prof.role)) {
    return { error: "Permission refusée." };
  }

  const { error } = await supabase.from('documents').delete().eq('id', docId);
  if (error) {
    console.error('Error deleting document:', error);
    return { error: "Erreur lors de la suppression." };
  }

  revalidatePath('/dashboard/documents');
  return { success: true };
}
