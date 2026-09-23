-- Migration : Ajout des colonnes de gestion manuelle et de traçabilité dans la table paiements
ALTER TABLE public.paiements 
ADD COLUMN IF NOT EXISTS methode_paiement VARCHAR(50) DEFAULT 'en_ligne',
ADD COLUMN IF NOT EXISTS reference_transaction VARCHAR(255),
ADD COLUMN IF NOT EXISTS notes TEXT;
