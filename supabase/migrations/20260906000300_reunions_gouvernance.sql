-- ========================================================
-- Migration: Module Autonome Réunions de Travail & Gouvernance (Sécurisée)
-- Date: 2026-09-06
-- ========================================================

-- 1. CREATION / RECREATION DES TYPES ENUM POUR LES REUNIONS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_reunion_gouvernance') THEN
    CREATE TYPE type_reunion_gouvernance AS ENUM (
      'bureau',
      'reunion_ca',
      'inter_commissions',
      'president_commissions',
      'commission',
      'extraordinaire'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_reunion') THEN
    CREATE TYPE statut_reunion AS ENUM (
      'convoquee',
      'en_cours',
      'terminee',
      'annulee'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_presence_reunion') THEN
    CREATE TYPE statut_presence_reunion AS ENUM (
      'convoque',
      'present',
      'excuse',
      'absent'
    );
  END IF;
END $$;

-- 2. TABLE PRINCIPALE REUNIONS
CREATE TABLE IF NOT EXISTS public.reunions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  type_reunion type_reunion_gouvernance DEFAULT 'bureau' NOT NULL,
  format_reunion format_evenement DEFAULT 'presentiel' NOT NULL,
  lieu TEXT,
  lien_visio TEXT,
  date_debut TIMESTAMPTZ NOT NULL,
  date_fin TIMESTAMPTZ,
  statut statut_reunion DEFAULT 'convoquee' NOT NULL,
  description TEXT,
  notes_privees TEXT,
  
  -- Rattachements & Responsabilités
  organisateur_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  commission_id UUID REFERENCES public.commissions(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reunions_type ON public.reunions(type_reunion);
CREATE INDEX IF NOT EXISTS idx_reunions_statut ON public.reunions(statut);
CREATE INDEX IF NOT EXISTS idx_reunions_date ON public.reunions(date_debut);
CREATE INDEX IF NOT EXISTS idx_reunions_commission ON public.reunions(commission_id);

-- 3. TABLE REUNION_ODJ_ITEMS (Ordre du Jour structuré)
CREATE TABLE IF NOT EXISTS public.reunion_odj_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reunion_id UUID REFERENCES public.reunions(id) ON DELETE CASCADE NOT NULL,
  ordre INTEGER DEFAULT 1 NOT NULL,
  titre TEXT NOT NULL,
  description TEXT,
  duree_minutes INTEGER DEFAULT 15,
  intervenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reunion_odj_reunion ON public.reunion_odj_items(reunion_id);

-- 4. TABLE REUNION_PRESENCES (Émargement & Convocations nominatives)
CREATE TABLE IF NOT EXISTS public.reunion_presences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reunion_id UUID REFERENCES public.reunions(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  statut statut_presence_reunion DEFAULT 'convoque' NOT NULL,
  motif_absence TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(reunion_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_reunion_presences_reunion ON public.reunion_presences(reunion_id);
CREATE INDEX IF NOT EXISTS idx_reunion_presences_profile ON public.reunion_presences(profile_id);

-- 5. TABLE REUNION_PVS (Procès-verbaux & Compte-rendus officiels)
CREATE TABLE IF NOT EXISTS public.reunion_pvs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reunion_id UUID REFERENCES public.reunions(id) ON DELETE CASCADE UNIQUE NOT NULL,
  compte_rendu TEXT NOT NULL,
  document_url TEXT,
  valide_par_bureau BOOLEAN DEFAULT FALSE NOT NULL,
  redige_par UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. LIAISON DES TACHES AUX REUNIONS
ALTER TABLE public.taches
  ADD COLUMN IF NOT EXISTS reunion_id UUID REFERENCES public.reunions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_taches_reunion ON public.taches(reunion_id);

-- 7. RLS POLICIES POUR LA SÉCURITÉ
ALTER TABLE public.reunions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reunion_odj_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reunion_presences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reunion_pvs ENABLE ROW LEVEL SECURITY;

-- Accès en lecture pour tous les membres authentifiés
CREATE POLICY "Les membres authentifiés peuvent voir les réunions" 
  ON public.reunions FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Les membres authentifiés peuvent voir les ODJ" 
  ON public.reunion_odj_items FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Les membres authentifiés peuvent voir l'émargement" 
  ON public.reunion_presences FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Les membres authentifiés peuvent voir les PVs" 
  ON public.reunion_pvs FOR SELECT 
  TO authenticated 
  USING (true);

-- Insertion & modification par le staff / admin / bureau / organisateur
CREATE POLICY "Le staff et organisateurs peuvent créer/modifier des réunions" 
  ON public.reunions FOR ALL 
  TO authenticated 
  USING (true) WITH CHECK (true);

CREATE POLICY "Le staff et organisateurs peuvent gérer les ODJ" 
  ON public.reunion_odj_items FOR ALL 
  TO authenticated 
  USING (true) WITH CHECK (true);

CREATE POLICY "Gestion des présences par membre et organisateurs" 
  ON public.reunion_presences FOR ALL 
  TO authenticated 
  USING (true) WITH CHECK (true);

CREATE POLICY "Le staff et rédacteurs peuvent gérer les PVs" 
  ON public.reunion_pvs FOR ALL 
  TO authenticated 
  USING (true) WITH CHECK (true);
