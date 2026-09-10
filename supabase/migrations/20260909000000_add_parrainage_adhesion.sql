-- Migration pour ajouter les champs de parrainage et de motivation au profil membre
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS motivation_adhesion TEXT,
  ADD COLUMN IF NOT EXISTS parrains TEXT,
  ADD COLUMN IF NOT EXISTS notes_adhesion TEXT;

COMMENT ON COLUMN public.profiles.motivation_adhesion IS 'Texte de motivation ou justification pour l adhésion';
COMMENT ON COLUMN public.profiles.parrains IS 'Informations sur les parrains ou références';
COMMENT ON COLUMN public.profiles.notes_adhesion IS 'Informations complémentaires destinées au CA pour faciliter la validation';
