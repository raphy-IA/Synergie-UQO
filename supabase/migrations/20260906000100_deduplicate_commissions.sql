-- ========================================================
-- Migration: Nettoyage et Déduplication des Commissions Système
-- Date: 2026-09-06
-- ========================================================

DO $$
DECLARE
  v_comm_rp UUID;
  v_comm_media UUID;
  v_comm_evt UUID;
  v_comm_solidarite UUID;
  r RECORD;
BEGIN
  -- 1. Récupérer les identifiants officiels des 4 commissions système
  SELECT id INTO v_comm_media FROM public.commissions WHERE code_systeme = 'comm_communication' OR nom ILIKE '%communication%' LIMIT 1;
  SELECT id INTO v_comm_rp FROM public.commissions WHERE code_systeme = 'comm_partenariats' OR nom ILIKE '%relation%' LIMIT 1;
  SELECT id INTO v_comm_evt FROM public.commissions WHERE code_systeme = 'comm_evenements' OR nom ILIKE '%événement%' OR nom ILIKE '%evenement%' LIMIT 1;
  SELECT id INTO v_comm_solidarite FROM public.commissions WHERE code_systeme = 'comm_solidarite' OR nom ILIKE '%entraide%' OR nom ILIKE '%solidarité%' LIMIT 1;

  -- 2. Consolider et réaffecter les doublons non système
  FOR r IN 
    SELECT id, nom FROM public.commissions 
    WHERE (est_systeme IS NOT TRUE OR code_systeme IS NULL)
  LOOP
    DECLARE
      v_target_id UUID := NULL;
    BEGIN
      IF r.nom ILIKE '%communication%' THEN
        v_target_id := v_comm_media;
      ELSIF r.nom ILIKE '%relation%' OR r.nom ILIKE '%partenariat%' THEN
        v_target_id := v_comm_rp;
      ELSIF r.nom ILIKE '%événement%' OR r.nom ILIKE '%evenement%' THEN
        v_target_id := v_comm_evt;
      ELSIF r.nom ILIKE '%entraide%' OR r.nom ILIKE '%solidarité%' OR r.nom ILIKE '%inclusion%' THEN
        v_target_id := v_comm_solidarite;
      END IF;

      IF v_target_id IS NOT NULL AND v_target_id <> r.id THEN
        -- Re-router toutes les dépendances vers la commission officielle
        UPDATE public.commission_membres SET commission_id = v_target_id WHERE commission_id = r.id;
        UPDATE public.commission_reunions SET commission_id = v_target_id WHERE commission_id = r.id;
        UPDATE public.taches SET commission_id = v_target_id WHERE commission_id = r.id;
        UPDATE public.documents SET commission_id = v_target_id WHERE commission_id = r.id;
        UPDATE public.evenements SET commission_id = v_target_id WHERE commission_id = r.id;
        UPDATE public.forum_sujets SET commission_id = v_target_id WHERE commission_id = r.id;
        UPDATE public.depenses_remboursements SET commission_id = v_target_id WHERE commission_id = r.id;
        UPDATE public.commission_missions SET commission_id = v_target_id WHERE commission_id = r.id;
        UPDATE public.commission_objectifs SET commission_id = v_target_id WHERE commission_id = r.id;

        -- Supprimer la commission doublon
        DELETE FROM public.commissions WHERE id = r.id;
      END IF;
    END;
  END LOOP;
END $$;
