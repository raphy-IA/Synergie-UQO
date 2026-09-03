-- Migration: Fix documents table RLS policy for authenticated members and public access
-- Date: 2026-09-02

DROP POLICY IF EXISTS "Documents publics visibles par tous" ON public.documents;
DROP POLICY IF EXISTS "Documents visibles par membres et public" ON public.documents;

-- Allow public access for public documents, and authenticated access for internal/member documents
CREATE POLICY "Documents visibles par membres et public" ON public.documents
  FOR SELECT USING (
    est_public IS TRUE 
    OR auth.uid() IS NOT NULL
  );
