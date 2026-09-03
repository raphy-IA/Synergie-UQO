-- Migration: Add date_approbation_adhesion column to profiles table
-- Date: 2026-09-02

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_approbation_adhesion TIMESTAMPTZ;

-- Backfill date_approbation_adhesion for existing approved/payment pending members where date_approbation_adhesion is NULL
UPDATE public.profiles
SET date_approbation_adhesion = COALESCE(updated_at, NOW())
WHERE (statut_adhesion = 'approuve' OR statut_adhesion = 'en_attente_paiement')
  AND date_approbation_adhesion IS NULL;
