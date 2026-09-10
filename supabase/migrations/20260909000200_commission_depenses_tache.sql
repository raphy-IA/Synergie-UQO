-- ========================================================
-- Migration: Add tache_id to demandes_depenses & update RLS
-- Date: 2026-09-09
-- ========================================================

ALTER TABLE public.demandes_depenses
  ADD COLUMN IF NOT EXISTS tache_id UUID REFERENCES public.taches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_depenses_tache ON public.demandes_depenses(tache_id);

-- Update RLS policy for demandes_depenses
DROP POLICY IF EXISTS "Depenses visibles par demandeur et admins" ON public.demandes_depenses;

CREATE POLICY "Depenses visibles par demandeur, membres de commission et admins" ON public.demandes_depenses
  FOR SELECT USING (
    auth.uid() = demandeur_id
    OR public.est_admin(auth.uid())
    OR commission_id IN (
      SELECT id FROM public.commissions WHERE responsable_id = auth.uid() OR responsable_adjoint_id = auth.uid()
    )
    OR commission_id IN (
      SELECT commission_id FROM public.commission_membres WHERE profile_id = auth.uid() AND actif = true
    )
  );
