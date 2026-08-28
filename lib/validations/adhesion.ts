import { z } from 'zod';

export const AdhesionSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit faire au moins 6 caractères" }),
  prenom: z.string().min(2, { message: "Le prénom doit faire au moins 2 caractères" }),
  nom: z.string().min(2, { message: "Le nom doit faire au moins 2 caractères" }),
  telephone: z
    .string()
    .regex(/^\+\d{7,15}$/, {
      message: "Format de téléphone international invalide. Veuillez sélectionner l'indicatif pays et saisir les chiffres locaux."
    })
    .optional()
    .or(z.literal('')),
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
    z.coerce.number().min(1970, "L'année doit être supérieure à 1970").max(new Date().getFullYear() + 6, "L'année de diplôme n'est pas réaliste").optional()
  ),
  poste_actuel: z.string().optional().or(z.literal('')),
  employeur: z.string().optional().or(z.literal('')),
  secteur_activite: z.string().optional().or(z.literal('')),
  consentement_loi_25: z.boolean().refine((val) => val === true, {
    message: "Vous devez consentir à la Loi 25 pour continuer",
  }),
});

export type AdhesionInput = z.infer<typeof AdhesionSchema>;
