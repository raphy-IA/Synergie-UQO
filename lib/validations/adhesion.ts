import { z } from 'zod';

export const AdhesionSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit faire au moins 6 caractères" }),
  prenom: z.string().min(2, { message: "Le prénom doit faire au moins 2 caractères" }),
  nom: z.string().min(2, { message: "Le nom doit faire au moins 2 caractères" }),
  telephone: z.string().min(10, { message: "Le téléphone doit faire au moins 10 chiffres" }).optional().or(z.literal('')),
  categorie: z.enum([
    'etudiant',
    'diplome',
    'ancien',
    'associe',
    'honneur',
    'professionnel_diplome',
    'professionnel_etudiant',
  ], {
    message: "Veuillez sélectionner une catégorie valide",
  }),
  programme_etudes: z.string().optional().or(z.literal('')),
  matricule_uqo: z.string().optional().or(z.literal('')),
  niveau_etudes: z.string().optional().or(z.literal('')),
  domaine_etudes: z.string().optional().or(z.literal('')),
  annee_diplome: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.coerce.number().optional()
  ),
  poste_actuel: z.string().optional().or(z.literal('')),
  employeur: z.string().optional().or(z.literal('')),
  secteur_activite: z.string().optional().or(z.literal('')),
  consentement_loi_25: z.boolean().refine((val) => val === true, {
    message: "Vous devez consentir à la Loi 25 pour continuer",
  }),
});

export type AdhesionInput = z.infer<typeof AdhesionSchema>;
