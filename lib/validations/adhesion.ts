import { z } from 'zod';

export const AdhesionSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit faire au moins 6 caractères" }),
  prenom: z.string().min(2, { message: "Le prénom doit faire au moins 2 caractères" }),
  nom: z.string().min(2, { message: "Le nom doit faire au moins 2 caractères" }),
  telephone: z.string().min(10, { message: "Le téléphone doit faire au moins 10 chiffres" }).optional().or(z.literal('')),
  categorie: z.enum(['etudiant', 'diplome', 'ancien', 'associe', 'honneur'], {
    message: "Veuillez sélectionner une catégorie valide",
  }),
  programme_etudes: z.string().optional(),
  matricule_uqo: z.string().optional(),
  consentement_loi_25: z.boolean().refine((val) => val === true, {
    message: "Vous devez consentir à la Loi 25 pour continuer",
  }),
});

export type AdhesionInput = z.infer<typeof AdhesionSchema>;
