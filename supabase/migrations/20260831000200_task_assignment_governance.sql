-- Migration SQL pour Synergie UQO - Gouvernance & Affectation des Tâches

-- 1. Enrichissement de la table taches avec le type de ciblage (membre, bureau, commission)
ALTER TABLE public.taches 
  ADD COLUMN IF NOT EXISTS cible_type VARCHAR(50) DEFAULT 'membre' NOT NULL,
  ADD COLUMN IF NOT EXISTS cible_id UUID,
  ADD COLUMN IF NOT EXISTS affectation_conjointe BOOLEAN DEFAULT false NOT NULL;

-- 2. Table d'affectations conjointes (Multiple assignees table)
CREATE TABLE IF NOT EXISTS public.taches_assignations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tache_id UUID REFERENCES public.taches(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role_assignation VARCHAR(50) DEFAULT 'joint' NOT NULL, -- 'principal', 'joint', 'responsable', 'adjoint'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(tache_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_taches_assignations_tache ON public.taches_assignations(tache_id);
CREATE INDEX IF NOT EXISTS idx_taches_assignations_profile ON public.taches_assignations(profile_id);

-- 3. Sécurité RLS
ALTER TABLE public.taches_assignations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affectations visibles par les membres connectes" ON public.taches_assignations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Gestion des affectations par les connectes" ON public.taches_assignations
  FOR ALL USING (auth.uid() IS NOT NULL);
