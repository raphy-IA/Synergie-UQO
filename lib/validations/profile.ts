import { z } from 'zod';

export const ProfileUpdateSchema = z.object({
  prenom: z.string().min(2, { message: "Le prénom doit faire au moins 2 caractères" }),
  nom: z.string().min(2, { message: "Le nom doit faire au moins 2 caractères" }),
  telephone: z.string().optional().or(z.literal('')),
  bio: z.string().optional().or(z.literal('')),
  linkedin_url: z.string().url({ message: "URL LinkedIn invalide" }).optional().or(z.literal('')),
  site_web: z.string().url({ message: "URL du site web invalide" }).optional().or(z.literal('')),
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
  notifications_email: z.boolean(),
  profil_public: z.boolean(),
});

export const ChangePasswordSchema = z
  .object({
    current_password: z.string().min(1, { message: "Le mot de passe actuel est requis" }),
    new_password: z.string().min(6, { message: "Le nouveau mot de passe doit faire au moins 6 caractères" }),
    confirm_password: z.string().min(1, { message: "La confirmation du mot de passe est requise" }),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm_password"],
  });

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
