-- Migration SQL pour Synergie UQO - CMS d'articles modernes (Temps de lecture, SEO, Tags, Bucket Images)

-- 1. AJOUT DES COLONNES POUR UN CMS MODERNE
ALTER TABLE public.articles 
  ADD COLUMN IF NOT EXISTS temps_lecture INTEGER DEFAULT 3 NOT NULL,
  ADD COLUMN IF NOT EXISTS seo_titre VARCHAR(255),
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[] NOT NULL;

-- 2. CRÉATION DU BUCKET PUBLIC POUR LES IMAGES DE COUVERTURE DES ARTICLES
INSERT INTO storage.buckets (id, name, public)
VALUES ('articles', 'articles', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques de sécurité pour Supabase Storage bucket 'articles'
CREATE POLICY "Admins et Comms peuvent televerser des images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'articles' AND (
      public.est_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.bureau_gouvernance
        WHERE profile_id = auth.uid() AND role_bureau IN ('president', 'vice_president', 'responsable_comm')
      )
    )
  );

CREATE POLICY "Tout le monde peut voir les images des articles" ON storage.objects
  FOR SELECT USING (bucket_id = 'articles');
