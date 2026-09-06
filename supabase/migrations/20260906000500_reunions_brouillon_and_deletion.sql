-- ========================================================
-- Migration: Ajout du statut 'brouillon' pour les Réunions
-- Date: 2026-09-06
-- ========================================================

DO $$ 
BEGIN
  ALTER TYPE public.statut_reunion ADD VALUE IF NOT EXISTS 'brouillon' BEFORE 'convoquee';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
