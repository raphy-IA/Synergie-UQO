-- ========================================================
-- Migration: Historique des Évolutions, Commentaires et Livrables de Tâches
-- Date: 2026-09-06
-- ========================================================

-- TABLE TACHE_EVOLUTIONS (Journal chronologique des évolutions)
CREATE TABLE IF NOT EXISTS public.tache_evolutions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tache_id UUID REFERENCES public.taches(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pourcentage_avancement INTEGER NOT NULL,
  commentaire TEXT,
  file_url TEXT,
  file_titre TEXT,
  type_evolution VARCHAR(50) DEFAULT 'avancement' NOT NULL, -- 'avancement', 'cloture'
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tache_evolutions_tache ON public.tache_evolutions(tache_id);
CREATE INDEX IF NOT EXISTS idx_tache_evolutions_profile ON public.tache_evolutions(profile_id);

-- POLITIQUES DE SÉCURITÉ RLS
ALTER TABLE public.tache_evolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Evolutions lisibles par connectes" ON public.tache_evolutions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Evolutions inserables par connectes" ON public.tache_evolutions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
