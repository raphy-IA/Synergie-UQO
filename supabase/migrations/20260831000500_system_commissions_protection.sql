-- ========================================================
-- Migration: Insert System Commissions & Prevent Deletion Trigger
-- Date: 2026-08-31
-- ========================================================

-- 1. Ensure columns exist
ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS budget_annuel NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS est_systeme BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS code_systeme TEXT UNIQUE;

-- 2. Insert/Seed the 4 Permanent System Commissions of Synergie UQO
INSERT INTO public.commissions (code_systeme, nom, description, objectifs, est_systeme, statut, budget_annuel)
VALUES
  (
    'comm_communication',
    'Communication & Marketing',
    'Commission permanente chargée de l''image de marque, des médias sociaux, de la gazette et de la promotion des membres.',
    'Assurer la visibilité de Synergie UQO, concevoir les supports visuels des événements et animer la communauté numérique.',
    TRUE,
    'active',
    1000.00
  ),
  (
    'comm_partenariats',
    'Relations Publiques & Partenariats',
    'Commission permanente chargée des commandites, des relations institutionnelles et du réseau des partenaires corporatifs.',
    'Développer des partenariats stratégiques, négocier des avantages statutaires pour les membres et sécuriser des commandites.',
    TRUE,
    'active',
    1500.00
  ),
  (
    'comm_evenements',
    'Événements & Intégration',
    'Commission permanente chargée de la conception, de la logistique et de l''organisation des Assemblées Générales, galas et ateliers.',
    'Organiser des événements d''intégration et des rencontres de réseautage professionnelles pour la communauté UQO.',
    TRUE,
    'active',
    2000.00
  ),
  (
    'comm_solidarite',
    'Entraide, Inclusion & Solidarité',
    'Commission permanente chargée de la gouvernance confidentielle du Fonds de Solidarité, du mentorat et de l''accueil des nouveaux arrivants.',
    'Analyser les demandes d''aide financière d''urgence, piloter le programme de parrainage/mentorat et promouvoir l''inclusion.',
    TRUE,
    'active',
    2500.00
  )
ON CONFLICT (code_systeme) DO UPDATE SET
  nom = EXCLUDED.nom,
  description = EXCLUDED.description,
  objectifs = EXCLUDED.objectifs,
  est_systeme = TRUE;

-- Also update by name if code_systeme was null previously
UPDATE public.commissions
SET est_systeme = TRUE, code_systeme = 'comm_communication'
WHERE nom = 'Communication & Marketing' AND code_systeme IS NULL AND NOT EXISTS (SELECT 1 FROM public.commissions WHERE code_systeme = 'comm_communication');

UPDATE public.commissions
SET est_systeme = TRUE, code_systeme = 'comm_partenariats'
WHERE nom = 'Relations Publiques & Partenariats' AND code_systeme IS NULL AND NOT EXISTS (SELECT 1 FROM public.commissions WHERE code_systeme = 'comm_partenariats');

UPDATE public.commissions
SET est_systeme = TRUE, code_systeme = 'comm_evenements'
WHERE nom = 'Événements & Intégration' AND code_systeme IS NULL AND NOT EXISTS (SELECT 1 FROM public.commissions WHERE code_systeme = 'comm_evenements');

UPDATE public.commissions
SET est_systeme = TRUE, code_systeme = 'comm_solidarite'
WHERE nom = 'Entraide, Inclusion & Solidarité' AND code_systeme IS NULL AND NOT EXISTS (SELECT 1 FROM public.commissions WHERE code_systeme = 'comm_solidarite');


-- 3. PostgreSQL Trigger to prevent deletion of system commissions
CREATE OR REPLACE FUNCTION public.prevent_system_commission_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.est_systeme IS TRUE OR OLD.code_systeme IS NOT NULL THEN
    RAISE EXCEPTION 'La commission système "%" (code: %) est statutaire et ne peut pas être supprimée.', OLD.nom, OLD.code_systeme;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_system_commission_deletion ON public.commissions;

CREATE TRIGGER trg_prevent_system_commission_deletion
BEFORE DELETE ON public.commissions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_system_commission_deletion();
