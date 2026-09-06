-- ========================================================
-- Migration: Support des Liens Directs dans les Notifications & Notifications Réunions
-- Date: 2026-09-06
-- ========================================================

-- 1. Ajout de la colonne link_url sur public.notifications si elle n'existe pas
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS link_url TEXT;

-- 2. Mise à jour de la politique RLS d'insertion des notifications pour les actions du serveur
CREATE POLICY "Le staff et le système peuvent insérer des notifications" 
  ON public.notifications FOR INSERT 
  TO authenticated 
  WITH CHECK (true);
