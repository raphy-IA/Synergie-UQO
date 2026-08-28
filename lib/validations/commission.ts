import { z } from 'zod';

export const CommissionSchema = z.object({
  nom: z.string().min(2, { message: "Le nom doit faire au moins 2 caractères" }),
  description: z.string().optional().or(z.literal('')),
  objectifs: z.string().optional().or(z.literal('')),
  date_fin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, {
      message: "Format de date invalide (AAAA-MM-JJ)",
    })
    .optional()
    .or(z.literal('')),
  statut: z.enum(['active', 'terminee', 'suspendue'], {
    message: "Statut de commission invalide (active, terminee, suspendue)",
  }),
  responsable_id: z
    .string()
    .uuid({ message: "Identifiant du responsable invalide" })
    .optional()
    .or(z.literal('')),
});

export type CommissionInput = z.infer<typeof CommissionSchema>;
export type CommissionType = z.infer<typeof CommissionSchema>;
