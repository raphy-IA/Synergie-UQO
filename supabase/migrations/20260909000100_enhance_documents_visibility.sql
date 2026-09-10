-- Migration SQL: Système de Dossiers & Droits d'Accès fins aux Documents
-- Date: 2026-09-09

-- 1. Table des dossiers de la bibliothèque de documents (Arborescence hiérarchique)
CREATE TABLE IF NOT EXISTS public.document_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
  slug VARCHAR(100) UNIQUE,
  icone VARCHAR(50) DEFAULT 'folder',
  couleur VARCHAR(50) DEFAULT 'blue',
  est_systeme BOOLEAN DEFAULT false NOT NULL, -- Dossiers système par défaut (Statuts, PV, Finances...)
  ordre INTEGER DEFAULT 0 NOT NULL,
  
  -- Visibilité spécifique au dossier (héritée ou surchargée)
  visibilite_defaut VARCHAR(50) DEFAULT 'membres' NOT NULL, -- 'public', 'membres', 'participants', 'commission', 'bureau_ca'
  commission_id UUID REFERENCES public.commissions(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour requêtes hiérarchiques rapides
CREATE INDEX IF NOT EXISTS idx_doc_folders_parent ON public.document_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_doc_folders_commission ON public.document_folders(commission_id);

-- 2. Enrichissement de la table documents pour les dossiers & visibilité fine
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibilite VARCHAR(50) DEFAULT 'membres' NOT NULL, -- 'public', 'membres', 'participants', 'commission', 'bureau_ca'
  ADD COLUMN IF NOT EXISTS reunion_id UUID REFERENCES public.reunions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cree_par UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS taille_octets BIGINT,
  ADD COLUMN IF NOT EXISTS extension VARCHAR(20);

-- Index d'optimisation
CREATE INDEX IF NOT EXISTS idx_documents_folder ON public.documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_reunion ON public.documents(reunion_id);
CREATE INDEX IF NOT EXISTS idx_documents_visibilite ON public.documents(visibilite);

-- 3. Insertion des dossiers systèmes par défaut s'ils n'existent pas
INSERT INTO public.document_folders (nom, slug, description, icone, couleur, est_systeme, ordre, visibilite_defaut)
VALUES 
  ('Textes & Statuts Officiels', 'textes-officiels', 'Statuts, règlements généraux et charte éthique', 'file-text', 'blue', true, 1, 'public'),
  ('Procès-Verbaux (AG & CA)', 'pv-gouvernance', 'Procès-verbaux des Assemblées Générales et du Conseil d''Administration', 'landmark', 'indigo', true, 2, 'membres'),
  ('Comptes-Rendus de Réunions & Événements', 'cr-reunions', 'Procès-verbaux et comptes-rendus des réunions et activités', 'calendar', 'amber', true, 3, 'participants'),
  ('Documents de Commissions & Projets', 'commissions-projets', 'Espaces de travail et livrables des différentes commissions', 'users', 'emerald', true, 4, 'commission'),
  ('Finances & Rapports Annuels', 'finances-rapports', 'Rapports financiers, bilans et budgets prévisionnels', 'dollar-sign', 'sky', true, 5, 'membres')
ON CONFLICT (slug) DO NOTHING;

-- Synchroniser les documents existants vers les dossiers par défaut selon leur catégorie
UPDATE public.documents d
SET folder_id = f.id,
    visibilite = CASE 
      WHEN d.est_public THEN 'public'
      WHEN d.categorie = 'statuts' THEN 'public'
      WHEN d.categorie = 'reglement' THEN 'public'
      WHEN d.categorie = 'pv_ag' THEN 'membres'
      WHEN d.categorie = 'rapport_financier' THEN 'membres'
      WHEN d.commission_id IS NOT NULL THEN 'commission'
      WHEN d.evenement_id IS NOT NULL THEN 'participants'
      ELSE 'membres'
    END
FROM public.document_folders f
WHERE d.folder_id IS NULL AND (
  (d.categorie IN ('statuts', 'reglement') AND f.slug = 'textes-officiels') OR
  (d.categorie = 'pv_ag' AND f.slug = 'pv-gouvernance') OR
  (d.categorie = 'rapport_financier' AND f.slug = 'finances-rapports') OR
  (d.commission_id IS NOT NULL AND f.slug = 'commissions-projets') OR
  (d.evenement_id IS NOT NULL AND f.slug = 'cr-reunions') OR
  (f.slug = 'textes-officiels')
);

-- RLS policies
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dossiers visibles par les utilisateurs connectes et publics" ON public.document_folders
  FOR SELECT USING (true);

CREATE POLICY "Admins gerent les dossiers" ON public.document_folders
  FOR ALL USING (public.est_admin(auth.uid()));
