-- Migration: Automatic Notifications for Forum Replies & Realtime Support
-- Date: 2026-09-02

-- 1. Trigger function to create an internal notification when someone replies to a forum thread
CREATE OR REPLACE FUNCTION public.notify_on_forum_reply()
RETURNS TRIGGER AS $$
DECLARE
  sujet_record RECORD;
  auteur_reponse_nom TEXT;
BEGIN
  SELECT id, auteur_id, titre INTO sujet_record
  FROM public.forum_sujets
  WHERE id = NEW.sujet_id;

  -- Only notify if the reply author is NOT the thread author
  IF sujet_record.auteur_id IS NOT NULL AND sujet_record.auteur_id <> NEW.auteur_id THEN
    SELECT prenom || ' ' || nom INTO auteur_reponse_nom
    FROM public.profiles
    WHERE id = NEW.auteur_id;

    INSERT INTO public.notifications (profile_id, titre, contenu)
    VALUES (
      sujet_record.auteur_id,
      'Nouvelle réponse sur votre sujet',
      COALESCE(auteur_reponse_nom, 'Un membre') || ' a répondu à votre discussion "' || sujet_record.titre || '".'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_forum_reply ON public.forum_messages;

CREATE TRIGGER trigger_notify_on_forum_reply
  AFTER INSERT ON public.forum_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_forum_reply();

-- 2. Enable Realtime publication for forum tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_sujets;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_messages;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
