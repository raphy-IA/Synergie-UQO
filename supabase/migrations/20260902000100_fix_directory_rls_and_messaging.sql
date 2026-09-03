-- Migration: Fix profiles RLS for Directory and Messaging, Enable Realtime for Messages
-- Date: 2026-09-02

-- 1. Drop existing restricted SELECT policy on profiles
DROP POLICY IF EXISTS "Profils lisibles par soi et admins" ON public.profiles;
DROP POLICY IF EXISTS "Profils lisibles par soi, admins et annuaire public" ON public.profiles;

-- 2. Create updated SELECT policy for profiles:
-- Allow reading a profile if:
-- - It is the user's own profile
-- - The requesting user is an admin
-- - The target profile has profil_public = true (member directory opt-in)
-- - The target profile belongs to executive board / admin roles (so members can contact administration)
CREATE POLICY "Profils lisibles par soi, admins et annuaire public" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id 
    OR public.est_admin(auth.uid())
    OR profil_public IS TRUE
    OR role IN ('admin_ca', 'tresorier', 'superadmin')
  );

-- 3. Enable supabase_realtime publication for messages_prives table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages_prives;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
