-- ========================================================
-- Migration: Governance & Pre-validation of Commission Expenses by Leaders
-- Date: 2026-09-09
-- ========================================================

ALTER TABLE public.demandes_depenses
  ADD COLUMN IF NOT EXISTS statut_commission TEXT DEFAULT 'valide',
  ADD COLUMN IF NOT EXISTS notes_commission TEXT,
  ADD COLUMN IF NOT EXISTS date_validation_commission TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validateur_commission_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_depenses_statut_comm ON public.demandes_depenses(statut_commission);
