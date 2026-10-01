-- ========================================================
-- Migration: Expense Execution & Proof of Payment Justificatif
-- Date: 2026-10-01
-- Description: Adds fields for post-payment execution proof and adjustment of real amount spent
-- ========================================================

ALTER TABLE public.demandes_depenses
  ADD COLUMN IF NOT EXISTS montant_reel_depense NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS justificatif_execution_url TEXT,
  ADD COLUMN IF NOT EXISTS statut_execution TEXT DEFAULT 'non_soumis', -- 'non_soumis', 'soumis', 'approuve', 'rejete', 'modifications_demandees'
  ADD COLUMN IF NOT EXISTS notes_execution_demandeur TEXT,
  ADD COLUMN IF NOT EXISTS notes_execution_tresorier TEXT,
  ADD COLUMN IF NOT EXISTS date_soumission_execution TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_arbitrage_execution TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arbitre_execution_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_depenses_statut_exec ON public.demandes_depenses(statut_execution);
