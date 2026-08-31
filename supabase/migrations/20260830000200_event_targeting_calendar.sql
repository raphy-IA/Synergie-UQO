-- Migration SQL pour Synergie UQO - Ciblage d'Audience et Visibilité des Événements

-- 1. ENUMS POUR L'AUDIENCE (Si non existant)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audience_evenement') THEN
    CREATE TYPE audience_evenement AS ENUM ('public', 'membres', 'administrateurs', 'bureau', 'commission');
  END IF;
END $$;

-- 2. AJOUT DES COLONNES SUR LES EVENEMENTS
ALTER TABLE public.evenements
  ADD COLUMN IF NOT EXISTS audience audience_evenement DEFAULT 'public' NOT NULL,
  ADD COLUMN IF NOT EXISTS requiert_inscription BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS visible_public BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS commission_id UUID REFERENCES public.commissions(id) ON DELETE SET NULL;

-- 3. INDEXATION POUR LES REQUETES DE FILTRAGE
CREATE INDEX IF NOT EXISTS idx_evenements_commission ON public.evenements(commission_id);
CREATE INDEX IF NOT EXISTS idx_evenements_visible_public ON public.evenements(visible_public);
CREATE INDEX IF NOT EXISTS idx_evenements_audience ON public.evenements(audience);
