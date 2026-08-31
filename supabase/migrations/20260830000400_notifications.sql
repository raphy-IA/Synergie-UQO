-- Migration SQL pour Synergie UQO - Notifications des membres

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  titre VARCHAR(255) NOT NULL,
  contenu TEXT NOT NULL,
  lu BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour accélérer la recherche par membre
CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON public.notifications(profile_id);

-- Politiques de sécurité RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs voient leurs propres notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Utilisateurs peuvent marquer leurs notifications comme lues" ON public.notifications
  FOR UPDATE USING (auth.uid() = profile_id);

-- Déclencheur automatique pour notifier un membre lors de l'approbation de sa candidature
CREATE OR REPLACE FUNCTION public.notify_adhesion_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.statut_adhesion = 'approuve' AND OLD.statut_adhesion <> 'approuve' THEN
    INSERT INTO public.notifications (profile_id, titre, contenu)
    VALUES (NEW.id, 'Félicitations !', 'Votre candidature a été approuvée par le Conseil d''Administration. Bienvenue chez Synergie UQO !');
  ELSIF NEW.statut_adhesion = 'en_attente_paiement' AND OLD.statut_adhesion <> 'en_attente_paiement' THEN
    INSERT INTO public.notifications (profile_id, titre, contenu)
    VALUES (NEW.id, 'Candidature acceptée !', 'Votre demande a été approuvée. Veuillez procéder au règlement de votre cotisation pour activer votre compte.');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_adhesion_approval
  AFTER UPDATE OF statut_adhesion ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_adhesion_approval();
