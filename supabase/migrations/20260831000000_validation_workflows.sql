-- Migration SQL : Flux de Validation Multi-Niveaux & Gestion des Dépenses

-- 1. TYPE ENUMS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_entite_validation') THEN
    CREATE TYPE type_entite_validation AS ENUM ('evenement', 'article', 'vote', 'partenaire', 'depense');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_validation') THEN
    CREATE TYPE statut_validation AS ENUM ('en_attente_n1', 'en_attente_n2', 'approuve', 'rejete', 'modifications_demandees');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_depense') THEN
    CREATE TYPE statut_depense AS ENUM ('brouillon', 'en_attente_n1', 'en_attente_n2', 'approuve', 'paye', 'rejete');
  END IF;
END $$;

-- 2. TABLE DES DEMANDES DE VALIDIATION (FLUX CENTRALISÉ)
CREATE TABLE IF NOT EXISTS public.validations_demandes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type_entite type_entite_validation NOT NULL,
  entite_id UUID NOT NULL,
  soumis_par UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  statut_validation statut_validation DEFAULT 'en_attente_n1' NOT NULL,
  niveau_requis INTEGER DEFAULT 1 NOT NULL, -- 1 ou 2 niveaux
  
  -- Niveau 1 (Trésorier / Secrétaire / Comm)
  validateur_n1_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  date_validation_n1 TIMESTAMP WITH TIME ZONE,
  commentaire_n1 TEXT,

  -- Niveau 2 (Présidence / CA)
  validateur_n2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  date_validation_n2 TIMESTAMP WITH TIME ZONE,
  commentaire_n2 TEXT,

  -- Date d'application / d'effet programmée
  date_effet_programmee TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour accélérer le filtrage par statut et type
CREATE INDEX IF NOT EXISTS idx_validations_statut ON public.validations_demandes(statut_validation);
CREATE INDEX IF NOT EXISTS idx_validations_entite ON public.validations_demandes(type_entite, entite_id);
CREATE INDEX IF NOT EXISTS idx_validations_soumis ON public.validations_demandes(soumis_par);

-- 3. TABLE DES DEMANDES DE DÉPENSES FINANCIÈRES
CREATE TABLE IF NOT EXISTS public.demandes_depenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  montant NUMERIC(10,2) NOT NULL,
  categorie VARCHAR(100) DEFAULT 'autre' NOT NULL,
  justificatif_url TEXT,
  demandeur_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  statut statut_depense DEFAULT 'en_attente_n1' NOT NULL,
  
  -- Liaisons optionnelles
  evenement_id UUID REFERENCES public.evenements(id) ON DELETE SET NULL,
  commission_id UUID REFERENCES public.commissions(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_depenses_demandeur ON public.demandes_depenses(demandeur_id);
CREATE INDEX IF NOT EXISTS idx_depenses_statut ON public.demandes_depenses(statut);

-- 4. POLITIQUES RLS
ALTER TABLE public.validations_demandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demandes_depenses ENABLE ROW LEVEL SECURITY;

-- Politiques validations_demandes
CREATE POLICY "Validations visibles par les membres et admins" ON public.validations_demandes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Soumission de validation par utilisateur connecte" ON public.validations_demandes
  FOR INSERT WITH CHECK (auth.uid() = soumis_par OR public.est_admin(auth.uid()));

CREATE POLICY "Mise a jour des validations par admins" ON public.validations_demandes
  FOR UPDATE USING (public.est_admin(auth.uid()) OR auth.uid() = soumis_par);

CREATE POLICY "Suppression des validations par admins" ON public.validations_demandes
  FOR DELETE USING (public.est_admin(auth.uid()));

-- Politiques demandes_depenses
CREATE POLICY "Depenses visibles par demandeur et admins" ON public.demandes_depenses
  FOR SELECT USING (auth.uid() = demandeur_id OR public.est_admin(auth.uid()));

CREATE POLICY "Insertion depenses par demandeur" ON public.demandes_depenses
  FOR INSERT WITH CHECK (auth.uid() = demandeur_id);

CREATE POLICY "Mise a jour depenses par demandeur ou admins" ON public.demandes_depenses
  FOR UPDATE USING (auth.uid() = demandeur_id OR public.est_admin(auth.uid()));

-- 5. VALEURS PAR DÉFAUT DANS SETTINGS_ASSOCIATION (Paramètres des flux)
INSERT INTO public.settings_association (key, value)
VALUES (
  'workflow_settings',
  '{
    "validation_depenses_mode": "double",
    "validation_depenses_seuil_n2": 100.00,
    "validation_evenements_niveau": 1,
    "validation_articles_niveau": 1,
    "validation_votes_niveau": 1,
    "validation_partenaires_niveau": 1,
    "notify_email_on_approval": true,
    "notify_app_on_approval": true
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
