-- Migration SQL pour Synergie UQO - Compléments et Modules Manquants

-- 1. ENUMS SUPPLÉMENTAIRES
CREATE TYPE statut_evenement AS ENUM ('brouillon', 'publie', 'annule', 'termine');
CREATE TYPE statut_inscription_evenement AS ENUM ('gratuit', 'en_attente', 'paye', 'rembourse');
CREATE TYPE categorie_document AS ENUM ('pv_ag', 'rapport_financier', 'statuts', 'reglement', 'autre');
CREATE TYPE statut_vote AS ENUM ('planifie', 'actif', 'clos');

-- 2. MODULE ÉVÉNEMENTS
CREATE TABLE IF NOT EXISTS public.evenements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  date_evenement TIMESTAMP WITH TIME ZONE NOT NULL,
  lieu VARCHAR(255) NOT NULL,
  capacite INTEGER,
  est_payant BOOLEAN DEFAULT false NOT NULL,
  prix DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  image_url TEXT,
  statut statut_evenement DEFAULT 'brouillon' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.inscriptions_evenements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evenement_id UUID REFERENCES public.evenements(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  statut_paiement statut_inscription_evenement DEFAULT 'gratuit' NOT NULL,
  presence_validee BOOLEAN DEFAULT false NOT NULL,
  stripe_session_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(evenement_id, profile_id)
);

-- 3. MODULE COMMUNICATION (Messagerie & Forums)
CREATE TABLE IF NOT EXISTS public.messages_prives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expediteur_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  destinataire_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  contenu TEXT NOT NULL,
  lu BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.forum_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.forum_sujets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  categorie_id UUID REFERENCES public.forum_categories(id) ON DELETE CASCADE NOT NULL,
  auteur_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  titre VARCHAR(255) NOT NULL,
  resolu BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.forum_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sujet_id UUID REFERENCES public.forum_sujets(id) ON DELETE CASCADE NOT NULL,
  auteur_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. MODULE GOUVERNANCE (Bibliothèque de documents & Vote électronique)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  categorie categorie_document DEFAULT 'autre' NOT NULL,
  est_public BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  date_debut TIMESTAMP WITH TIME ZONE NOT NULL,
  date_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  est_anonyme BOOLEAN DEFAULT true NOT NULL,
  statut statut_vote DEFAULT 'planifie' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.vote_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vote_id UUID REFERENCES public.votes(id) ON DELETE CASCADE NOT NULL,
  texte VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.vote_participations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vote_id UUID REFERENCES public.votes(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES public.vote_options(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(vote_id, profile_id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_inscriptions_evenement ON public.inscriptions_evenements(evenement_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_profile ON public.inscriptions_evenements(profile_id);
CREATE INDEX IF NOT EXISTS idx_messages_expediteur ON public.messages_prives(expediteur_id);
CREATE INDEX IF NOT EXISTS idx_messages_destinataire ON public.messages_prives(destinataire_id);
CREATE INDEX IF NOT EXISTS idx_forum_sujets_categorie ON public.forum_sujets(categorie_id);
CREATE INDEX IF NOT EXISTS idx_forum_messages_sujet ON public.forum_messages(sujet_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.evenements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscriptions_evenements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages_prives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_sujets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_participations ENABLE ROW LEVEL SECURITY;

-- 5. POLICIES RLS

-- Evenements Policies
CREATE POLICY "Evenements visibles par tous si publies" ON public.evenements
  FOR SELECT USING (statut = 'publie' OR public.est_admin(auth.uid()));

CREATE POLICY "Admins gerent evenements" ON public.evenements
  FOR ALL USING (public.est_admin(auth.uid()));

-- Inscriptions Evenements Policies
CREATE POLICY "Inscriptions visibles par soi et admins" ON public.inscriptions_evenements
  FOR SELECT USING (auth.uid() = profile_id OR public.est_admin(auth.uid()));

CREATE POLICY "Membres peuvent s'inscrire" ON public.inscriptions_evenements
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Admins et soi gerent inscriptions" ON public.inscriptions_evenements
  FOR ALL USING (auth.uid() = profile_id OR public.est_admin(auth.uid()));

-- Messages Prives Policies
CREATE POLICY "Lecture messages par expediteur ou destinataire" ON public.messages_prives
  FOR SELECT USING (auth.uid() = expediteur_id OR auth.uid() = destinataire_id);

CREATE POLICY "Envoi messages par l'expediteur" ON public.messages_prives
  FOR INSERT WITH CHECK (auth.uid() = expediteur_id);

-- Forum Policies (Tous les connectes peuvent voir et participer)
CREATE POLICY "Lecture categories forum" ON public.forum_categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins gerent categories" ON public.forum_categories FOR ALL USING (public.est_admin(auth.uid()));

CREATE POLICY "Lecture sujets forum" ON public.forum_sujets FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Creation sujets par membres" ON public.forum_sujets FOR INSERT WITH CHECK (auth.uid() = auteur_id);
CREATE POLICY "Auteur et admins gerent sujets" ON public.forum_sujets FOR ALL USING (auth.uid() = auteur_id OR public.est_admin(auth.uid()));

CREATE POLICY "Lecture messages forum" ON public.forum_messages FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Creation messages forum" ON public.forum_messages FOR INSERT WITH CHECK (auth.uid() = auteur_id);
CREATE POLICY "Auteur et admins gerent messages forum" ON public.forum_messages FOR ALL USING (auth.uid() = auteur_id OR public.est_admin(auth.uid()));

-- Documents Policies
CREATE POLICY "Documents publics visibles par tous" ON public.documents
  FOR SELECT USING (est_public = true OR (auth.uid() IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND statut_adhesion = 'approuve'
  )));

CREATE POLICY "Admins gerent documents" ON public.documents
  FOR ALL USING (public.est_admin(auth.uid()));

-- Votes Policies
CREATE POLICY "Votes visibles par membres approuves" ON public.votes
  FOR SELECT USING (auth.uid() IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND statut_adhesion = 'approuve'
  ));

CREATE POLICY "Admins gerent votes" ON public.votes
  FOR ALL USING (public.est_admin(auth.uid()));

CREATE POLICY "Options visibles par membres approuves" ON public.vote_options
  FOR SELECT USING (auth.uid() IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND statut_adhesion = 'approuve'
  ));

CREATE POLICY "Admins gerent options" ON public.vote_options
  FOR ALL USING (public.est_admin(auth.uid()));

CREATE POLICY "Participations visibles par soi et admins" ON public.vote_participations
  FOR SELECT USING (auth.uid() = profile_id OR public.est_admin(auth.uid()));

CREATE POLICY "Membres approuves peuvent voter" ON public.vote_participations
  FOR INSERT WITH CHECK (auth.uid() = profile_id AND EXISTS(
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND statut_adhesion = 'approuve'
  ));
