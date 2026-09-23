-- Migration: Update ENUM statut_validation and validations_demandes schema to support double validation per level
ALTER TYPE public.statut_validation ADD VALUE IF NOT EXISTS 'en_attente_n1_2e_signature';
ALTER TYPE public.statut_validation ADD VALUE IF NOT EXISTS 'en_attente_n2_2e_signature';

ALTER TABLE public.validations_demandes
  ADD COLUMN IF NOT EXISTS validateur_n1_bis_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS date_validation_n1_bis TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS commentaire_n1_bis TEXT,
  ADD COLUMN IF NOT EXISTS validateur_n2_bis_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS date_validation_n2_bis TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS commentaire_n2_bis TEXT;
