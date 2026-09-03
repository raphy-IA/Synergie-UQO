-- Migration: Fix RLS policies for Votes and Options to allow authenticated members to view ballots
-- Date: 2026-09-02

DROP POLICY IF EXISTS "Votes visibles par membres approuves" ON public.votes;
DROP POLICY IF EXISTS "Options visibles par membres approuves" ON public.vote_options;

-- 1. Allow authenticated members to view votes
CREATE POLICY "Votes visibles par utilisateurs connectes" ON public.votes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 2. Allow authenticated members to view vote options
CREATE POLICY "Options visibles par utilisateurs connectes" ON public.vote_options
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 3. Allow admins to insert or manage votes
DROP POLICY IF EXISTS "Admins gerent votes" ON public.votes;
CREATE POLICY "Admins et createurs gerent votes" ON public.votes
  FOR ALL USING (public.est_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins gerent options" ON public.vote_options;
CREATE POLICY "Admins et createurs gerent options" ON public.vote_options
  FOR ALL USING (public.est_admin(auth.uid()));
