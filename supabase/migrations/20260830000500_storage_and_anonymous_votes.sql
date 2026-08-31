-- Migration SQL pour Synergie UQO - Supabase Storage et Bulletins Anonymes

-- 1. CRÉATION DU BUCKET DE STOCKAGE DES DOCUMENTS
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Politiques de sécurité pour Supabase Storage
CREATE POLICY "Admins/Secrétaires peuvent téléverser des documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND (
      public.est_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.bureau_gouvernance
        WHERE profile_id = auth.uid() AND role_bureau IN ('president', 'vice_president', 'secretaire')
      )
    )
  );

CREATE POLICY "Membres approuvés peuvent lire les documents du bucket" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND (
      auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND statut_adhesion = 'approuve'
      )
    )
  );

-- 2. TABLE DES BULLETINS DE VOTE ANONYMES DÉCORRÉLÉS DES PROFILS
CREATE TABLE IF NOT EXISTS public.vote_bulletins_anonymes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vote_id UUID REFERENCES public.votes(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES public.vote_options(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS sur les bulletins anonymes
ALTER TABLE public.vote_bulletins_anonymes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture des bulletins par membres approuves" ON public.vote_bulletins_anonymes
  FOR SELECT USING (auth.uid() IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND statut_adhesion = 'approuve'
  ));

-- Le vote n'est insérable que si le membre est approuvé
CREATE POLICY "Insertion de bulletin anonyme" ON public.vote_bulletins_anonymes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND statut_adhesion = 'approuve'
    )
  );
