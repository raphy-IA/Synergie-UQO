import { z } from 'zod';

export const AdhesionSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit faire au moins 6 caractères" }),
  prenom: z.string().min(2, { message: "Le prénom doit faire au moins 2 caractères" }),
  nom: z.string().min(2, { message: "Le nom doit faire au moins 2 caractères" }),
  telephone: z
    .string()
    .min(1, { message: "Le numéro de téléphone est obligatoire" })
    .regex(/^\+\d{7,15}$/, {
      message: "Format de téléphone international invalide. Veuillez sélectionner l'indicatif pays et saisir les chiffres locaux."
    }),
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

  // Modal 3 : Parrainage & Motivation (Optionnels)
  motivation_adhesion: z.string().optional().or(z.literal('')),
  parrains: z.string().optional().or(z.literal('')),
  notes_adhesion: z.string().optional().or(z.literal('')),

  // Modal 4 : Consentement
  consentement_loi_25: z.boolean().refine((val) => val === true, {
    message: "Vous devez consentir à la Loi 25 pour continuer",
  }),
}).superRefine((data, ctx) => {
  const isUQOLinked = data.categorie !== 'associe' && data.categorie !== 'honneur';
  const requiresMatricule = data.categorie === 'etudiant' || data.categorie === 'ancien' || data.categorie === 'professionnel_etudiant';
  const requiresDiplomaYear = data.categorie === 'diplome' || data.categorie === 'professionnel_diplome';
  const isProfessional = data.categorie === 'professionnel_diplome' || data.categorie === 'professionnel_etudiant';

  if (isUQOLinked) {
    if (!data.domaine_etudes || data.domaine_etudes.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le domaine d'études est obligatoire pour cette catégorie",
        path: ['domaine_etudes'],
      });
    }
    if (!data.programme_etudes || data.programme_etudes.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le programme d'études est obligatoire pour cette catégorie",
        path: ['programme_etudes'],
      });
    }
  }

  if (requiresMatricule) {
    if (!data.matricule_uqo || data.matricule_uqo.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le numéro matricule UQO est obligatoire pour les étudiants et anciens étudiants",
        path: ['matricule_uqo'],
      });
    }
  }

  if (requiresDiplomaYear) {
    if (!data.annee_diplome) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "L'année de diplôme / fin d'études est obligatoire pour les diplômés",
        path: ['annee_diplome'],
      });
    }
  }

  if (isProfessional) {
    if (!data.poste_actuel || data.poste_actuel.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le poste actuel est obligatoire pour les professionnels",
        path: ['poste_actuel'],
      });
    }
    if (!data.employeur || data.employeur.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "L'employeur est obligatoire pour les professionnels",
        path: ['employeur'],
      });
    }
    if (!data.secteur_activite || data.secteur_activite.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le secteur d'activité est obligatoire pour les professionnels",
        path: ['secteur_activite'],
      });
    }
  }
});

export type AdhesionInput = z.infer<typeof AdhesionSchema>;
