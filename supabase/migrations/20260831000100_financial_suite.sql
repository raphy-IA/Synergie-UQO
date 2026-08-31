-- Migration SQL : Suite Financière Complète, Fonds de Solidarité & Fond de Caisse Initial

-- 1. TABLE DES DEMANDES D'AIDE DE SOLIDARITÉ ET SECOURS D'URGENCE
CREATE TABLE IF NOT EXISTS public.fonds_solidarite_demandes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  demandeur_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  montant_demande NUMERIC(10,2) NOT NULL,
  motif TEXT NOT NULL,
  justificatif_url TEXT,
  statut VARCHAR(50) DEFAULT 'en_attente' NOT NULL, -- en_attente, approuve, rejete, verse
  
  -- Arbitrage & Décision
  decision_par UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  commentaire_decision TEXT,
  date_decision TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour requêtes
CREATE INDEX IF NOT EXISTS idx_fonds_demandeur ON public.fonds_solidarite_demandes(demandeur_id);
CREATE INDEX IF NOT EXISTS idx_fonds_statut ON public.fonds_solidarite_demandes(statut);

-- 2. POLITIQUES RLS FONDS DE SOLIDARITÉ
ALTER TABLE public.fonds_solidarite_demandes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres voient leurs propres demandes d aide" ON public.fonds_solidarite_demandes
  FOR SELECT USING (auth.uid() = demandeur_id OR public.est_admin(auth.uid()));

CREATE POLICY "Membres peuvent soumettre une demande d aide" ON public.fonds_solidarite_demandes
  FOR INSERT WITH CHECK (auth.uid() = demandeur_id);

CREATE POLICY "Admins modifient les demandes d aide" ON public.fonds_solidarite_demandes
  FOR UPDATE USING (public.est_admin(auth.uid()) OR auth.uid() = demandeur_id);

-- 3. PARAMÈTRE FOND DE CAISSE INITIAL DANS SETTINGS
INSERT INTO public.settings_association (key, value)
VALUES (
  'fond_caisse_initial',
  '{"montant": 0.00, "devise": "CAD"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
