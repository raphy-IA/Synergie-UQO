-- Migration SQL pour Synergie UQO - Extension Événements, Tâches et Documents

-- 1. ENUMS SUPPLÉMENTAIRES (Si non existants)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_evenement') THEN
    CREATE TYPE type_evenement AS ENUM ('ag', 'age', 'ca', 'reunion_travail', 'sortie', 'assistance', 'action_sociale', 'autre');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'format_evenement') THEN
    CREATE TYPE format_evenement AS ENUM ('presentiel', 'en_ligne', 'hybride');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_tache') THEN
    CREATE TYPE statut_tache AS ENUM ('a_faire', 'en_cours', 'termine', 'annule');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priorite_tache') THEN
    CREATE TYPE priorite_tache AS ENUM ('basse', 'moyenne', 'haute');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contexte_tache') THEN
    CREATE TYPE contexte_tache AS ENUM ('general', 'bureau', 'commission', 'ag');
  END IF;
END $$;

-- 2. ENRICHISSEMENT DE LA TABLE EVENEMENTS
ALTER TABLE public.evenements 
  ADD COLUMN IF NOT EXISTS type_evt type_evenement DEFAULT 'autre' NOT NULL,
  ADD COLUMN IF NOT EXISTS format_evt format_evenement DEFAULT 'presentiel' NOT NULL,
  ADD COLUMN IF NOT EXISTS date_fin_evenement TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS lien_reunion TEXT;

-- 3. CREATION DE LA TABLE TACHES
CREATE TABLE IF NOT EXISTS public.taches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  statut statut_tache DEFAULT 'a_faire' NOT NULL,
  priorite priorite_tache DEFAULT 'moyenne' NOT NULL,
  contexte contexte_tache DEFAULT 'general' NOT NULL,
  date_echeance TIMESTAMP WITH TIME ZONE,
  
  -- Assignation & Création
  assigne_a UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cree_par UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Liaisons optionnelles
  commission_id UUID REFERENCES public.commissions(id) ON DELETE CASCADE,
  evenement_id UUID REFERENCES public.evenements(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour la performance des requêtes
CREATE INDEX IF NOT EXISTS idx_taches_assigne_a ON public.taches(assigne_a);
CREATE INDEX IF NOT EXISTS idx_taches_commission ON public.taches(commission_id);
CREATE INDEX IF NOT EXISTS idx_taches_evenement ON public.taches(evenement_id);

-- 4. MODIFICATION DE LA TABLE DOCUMENTS POUR LES LIAISONS
ALTER TABLE public.documents ALTER COLUMN categorie TYPE VARCHAR(100);

ALTER TABLE public.documents 
  ADD COLUMN IF NOT EXISTS evenement_id UUID REFERENCES public.evenements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tache_id UUID REFERENCES public.taches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commission_id UUID REFERENCES public.commissions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_evenement ON public.documents(evenement_id);
CREATE INDEX IF NOT EXISTS idx_documents_tache ON public.documents(tache_id);
CREATE INDEX IF NOT EXISTS idx_documents_commission ON public.documents(commission_id);

-- 5. POLITIQUES DE SECURITE RLS TACHES
ALTER TABLE public.taches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Taches visibles par les connectes" ON public.taches
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Membres peuvent modifier le statut de leurs taches" ON public.taches
  FOR UPDATE USING (auth.uid() = assigne_a OR public.est_admin(auth.uid()));

CREATE POLICY "Admins gerent completement les taches" ON public.taches
  FOR ALL USING (public.est_admin(auth.uid()));
