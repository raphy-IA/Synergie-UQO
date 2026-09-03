-- Migration: Add 'brouillon' value to statut_vote enum
-- Date: 2026-09-02

ALTER TYPE public.statut_vote ADD VALUE IF NOT EXISTS 'brouillon';
