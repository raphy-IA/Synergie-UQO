-- Migration : Ajout des colonnes de gestion manuelle, compte de trésorerie et traçabilité dans la table paiements
ALTER TABLE public.paiements 
ADD COLUMN IF NOT EXISTS compte_id VARCHAR(100) DEFAULT 'compte_banque_principal',
ADD COLUMN IF NOT EXISTS methode_paiement VARCHAR(50) DEFAULT 'en_ligne',
ADD COLUMN IF NOT EXISTS reference_transaction VARCHAR(255),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Migration : Ajout des colonnes de compte débiteur dans demandes_depenses
ALTER TABLE public.demandes_depenses
ADD COLUMN IF NOT EXISTS compte_id VARCHAR(100) DEFAULT 'compte_banque_principal',
ADD COLUMN IF NOT EXISTS methode_paiement VARCHAR(50) DEFAULT 'virement_bancaire',
ADD COLUMN IF NOT EXISTS reference_transaction VARCHAR(255),
ADD COLUMN IF NOT EXISTS notes_paiement TEXT;
