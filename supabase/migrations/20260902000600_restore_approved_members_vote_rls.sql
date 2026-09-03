-- Migration: Restore approved members RLS policy for votes and vote_options
-- Date: 2026-09-02

DROP POLICY IF EXISTS "Votes visibles par utilisateurs connectes" ON public.votes;
DROP POLICY IF EXISTS "Votes visibles par membres approuves" ON public.votes;

-- Only approved members or admins can view votes
CREATE POLICY "Votes visibles par membres approuves" ON public.votes
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      public.est_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND statut_adhesion = 'approuve'
      )
    )
  );

DROP POLICY IF EXISTS "Options visibles par utilisateurs connectes" ON public.vote_options;
DROP POLICY IF EXISTS "Options visibles par membres approuves" ON public.vote_options;

-- Only approved members or admins can view vote options
CREATE POLICY "Options visibles par membres approuves" ON public.vote_options
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      public.est_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND statut_adhesion = 'approuve'
      )
    )
  );
