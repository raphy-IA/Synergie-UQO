-- Migration SQL pour Synergie UQO - Configuration des Délais de Grâce d'Adhésion & Renouvellement

-- Insertion des paramètres par défaut pour les délais de grâce et la durée de validité de la cotisation
INSERT INTO public.settings_association (key, value) VALUES
('delais_adhesion', '{
  "delai_grace_adhesion_jours": 14,
  "delai_grace_renouvellement_jours": 14,
  "duree_validite_cotisation_jours": 365
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
