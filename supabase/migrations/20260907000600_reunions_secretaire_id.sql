-- Add secretaire_id (Rapporteur de séance) to public.reunions
ALTER TABLE public.reunions 
ADD COLUMN IF NOT EXISTS secretaire_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
