-- ========================================================
-- Migration: Commission Workspace Enhancements & System Commissions Seed
-- Date: 2026-08-31
-- ========================================================

-- 1. Alter commissions table to add budget_annuel & est_systeme
ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS budget_annuel NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS est_systeme BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS code_systeme TEXT UNIQUE;

-- 2. Insert/Seed the 4 Permanent System Commissions of Synergie UQO
INSERT INTO public.commissions (code_systeme, nom, description, objectifs, est_systeme, statut, budget_annuel)
VALUES
  (
    'comm_communication',
    'Communication & Marketing',
    'Commission permanente chargée de l''image de marque, des médias sociaux, de la gazette et de la promotion des membres.',
    'Assurer la visibilité de Synergie UQO, concevoir les supports visuels des événements et animer la communauté numérique.',
    TRUE,
    'active',
    1000.00
  ),
  (
    'comm_partenariats',
    'Relations Publiques & Partenariats',
    'Commission permanente chargée des commandites, des relations institutionnelles et du réseau des partenaires corporatifs.',
    'Développer des partenariats stratégiques, négocier des avantages statutaires pour les membres et sécuriser des commandites.',
    TRUE,
    'active',
    1500.00
  ),
  (
    'comm_evenements',
    'Événements & Intégration',
    'Commission permanente chargée de la conception, de la logistique et de l''organisation des Assemblées Générales, galas et ateliers.',
    'Organiser des événements d''intégration et des rencontres de réseautage professionnelles pour la communauté UQO.',
    TRUE,
    'active',
    2000.00
  ),
  (
    'comm_solidarite',
    'Entraide, Inclusion & Solidarité',
    'Commission permanente chargée de la gouvernance confidentielle du Fonds de Solidarité, du mentorat et de l''accueil des nouveaux arrivants.',
    'Analyser les demandes d''aide financière d''urgence, piloter le programme de parrainage/mentorat et promouvoir l''inclusion.',
    TRUE,
    'active',
    2500.00
  )
ON CONFLICT (code_systeme) DO UPDATE SET
  nom = EXCLUDED.nom,
  description = EXCLUDED.description,
  objectifs = EXCLUDED.objectifs,
  est_systeme = TRUE;

-- 3. Create commission_reunions table
CREATE TABLE IF NOT EXISTS public.commission_reunions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commission_id UUID REFERENCES public.commissions(id) ON DELETE CASCADE NOT NULL,
  titre TEXT NOT NULL,
  ordre_du_jour TEXT,
  date_reunion TIMESTAMPTZ NOT NULL,
  lieu_ou_lien TEXT,
  cree_par UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_commission_reunions_comm ON public.commission_reunions(commission_id);
CREATE INDEX IF NOT EXISTS idx_commission_reunions_date ON public.commission_reunions(date_reunion);

-- RLS for commission_reunions
ALTER TABLE public.commission_reunions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reunions lisibles par membres" ON public.commission_reunions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Reunions inserables par membres" ON public.commission_reunions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Reunions modifiables par createur ou admin" ON public.commission_reunions
  FOR ALL USING (auth.uid() = cree_par OR public.est_admin(auth.uid()));

-- 4. Add commission_id to forum_sujets if not present
ALTER TABLE public.forum_sujets
  ADD COLUMN IF NOT EXISTS commission_id UUID REFERENCES public.commissions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_forum_sujets_commission ON public.forum_sujets(commission_id);
