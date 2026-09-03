-- Migration: Automatic Notification Trigger on Private Messages
-- Date: 2026-09-02

-- 1. Allow authenticated users to insert notifications
CREATE POLICY "Insertion de notifications par utilisateurs authentifies" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Trigger function to create an internal notification when a private message is sent
CREATE OR REPLACE FUNCTION public.notify_on_private_message()
RETURNS TRIGGER AS $$
DECLARE
  expediteur_nom TEXT;
BEGIN
  SELECT prenom || ' ' || nom INTO expediteur_nom
  FROM public.profiles
  WHERE id = NEW.expediteur_id;

  INSERT INTO public.notifications (profile_id, titre, contenu)
  VALUES (
    NEW.destinataire_id,
    'Nouveau message de ' || COALESCE(expediteur_nom, 'un membre'),
    CASE 
      WHEN length(NEW.contenu) > 80 THEN substring(NEW.contenu from 1 for 77) || '...'
      ELSE NEW.contenu
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_private_message ON public.messages_prives;

CREATE TRIGGER trigger_notify_on_private_message
  AFTER INSERT ON public.messages_prives
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_private_message();
