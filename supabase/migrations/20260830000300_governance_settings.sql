-- Migration SQL pour Synergie UQO - Configuration et Gouvernance

-- 1. TABLE DU BUREAU ET CONSEIL D'ADMINISTRATION
CREATE TABLE IF NOT EXISTS public.bureau_gouvernance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role_bureau VARCHAR(100) NOT NULL, -- 'president', 'vice_president', 'secretaire', 'tresorier', 'responsable_comm', 'responsable_partenariat', 'conseiller', 'responsable_dossier', 'administrateur_ca'
  titre_personnalise VARCHAR(255),  -- Ex: "Responsable du dossier informatique"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(profile_id, role_bureau)
);

-- Index pour accélérer les jointures de profils
CREATE INDEX IF NOT EXISTS idx_bureau_gouvernance_profile ON public.bureau_gouvernance(profile_id);

-- 2. TABLE DES PARAMÈTRES GENERAUX DE L'ASSOCIATION (Cotisations, Solidarité)
CREATE TABLE IF NOT EXISTS public.settings_association (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertion des valeurs par défaut pour les finances et le fonds de solidarité
INSERT INTO public.settings_association (key, value) VALUES
('cotisation_annuelle', '{"montant": 50.00, "devise": "CAD"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings_association (key, value) VALUES
('fonds_solidarite', '{
  "seuil_max": 500.00,
  "devise": "CAD",
  "critere_eligibilite": "Être membre actif depuis au moins 6 mois et justifier de difficultés financières temporaires.",
  "processus_analyse": "Analyse anonyme des demandes par un comité désigné du bureau.",
  "reddition_comptes": "Rapport annuel consolidé présenté lors de l''assemblée générale."
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. AJOUT DE CHAMP POUR RESPONSABLE ADJOINT DANS LES COMMISSIONS
ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS responsable_adjoint_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
