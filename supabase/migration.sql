-- Migration SQL pour Synergie UQO

-- ENUMS
CREATE TYPE role_utilisateur AS ENUM ('membre', 'admin_ca', 'tresorier', 'superadmin');
CREATE TYPE categorie_membre AS ENUM ('etudiant', 'diplome', 'ancien', 'associe', 'honneur');
CREATE TYPE statut_adhesion AS ENUM ('en_attente_paiement', 'en_attente_approbation', 'approuve', 'rejete', 'suspendu');
CREATE TYPE categorie_article AS ENUM ('education', 'carriere', 'entrepreneuriat', 'politiques_lois', 'vie_associative');

-- 1. PROFILES (Lié à auth.users de Supabase)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  telephone VARCHAR(30),
  role role_utilisateur DEFAULT 'membre' NOT NULL,
  categorie categorie_membre NOT NULL,
  programme_etudes VARCHAR(255),
  matricule_uqo VARCHAR(50),
  bio TEXT,
  linkedin_url VARCHAR(255),
  avatar_url TEXT,
  statut_adhesion statut_adhesion DEFAULT 'en_attente_paiement' NOT NULL,
  date_expiration_adhesion TIMESTAMP WITH TIME ZONE,
  consentement_loi_25 BOOLEAN DEFAULT false NOT NULL,
  qr_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PAIEMENTS & COTISATIONS
CREATE TABLE public.paiements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  stripe_session_id VARCHAR(255) UNIQUE,
  stripe_payment_intent VARCHAR(255),
  montant DECIMAL(10,2) NOT NULL,
  devise VARCHAR(10) DEFAULT 'CAD' NOT NULL,
  statut VARCHAR(50) NOT NULL,
  type_paiement VARCHAR(50) DEFAULT 'cotisation_annuelle' NOT NULL,
  recu_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ARTICLES DE BLOG (CMS)
CREATE TABLE public.articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  titre VARCHAR(255) NOT NULL,
  resume TEXT NOT NULL,
  contenu TEXT NOT NULL,
  image_couverture TEXT,
  categorie categorie_article NOT NULL,
  auteur_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  est_publie BOOLEAN DEFAULT false NOT NULL,
  date_publication TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. PARTENAIRES
CREATE TABLE public.partenaires (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  description TEXT,
  logo_url TEXT NOT NULL,
  site_web VARCHAR(255),
  niveau VARCHAR(50) DEFAULT 'argent' NOT NULL, -- platine, or, argent
  actif BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partenaires ENABLE ROW LEVEL SECURITY;

-- Profiles:
-- 1. Un utilisateur peut lire son propre profil
-- 2. Un admin/superadmin/tresorier peut lire tous les profils
-- 3. Permettre l'insertion d'un profil par le service de SignUp (ou l'utilisateur lui-même pendant l'inscription)
-- 4. Un utilisateur peut modifier son propre profil (limité aux champs non sensibles ou géré par des contrôles d'accès)
CREATE POLICY "Profils lisibles par soi et admins" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin_ca', 'superadmin', 'tresorier'))
  );

CREATE POLICY "Profils insérables par le propriétaire" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

CREATE POLICY "Profils modifiables par soi et admins" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin_ca', 'superadmin'))
  );

-- Paiements:
-- 1. Un utilisateur peut lire ses propres paiements
-- 2. Les admins/tresorier peuvent lire tous les paiements
-- 3. Le webhook stripe (admin bypass) ou l'utilisateur peut insérer
CREATE POLICY "Paiements lisibles par soi et admins" ON public.paiements
  FOR SELECT USING (
    auth.uid() = profile_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin_ca', 'tresorier', 'superadmin'))
  );

-- Articles de blog:
-- 1. Les articles publiés sont visibles par tous (public)
-- 2. Les admins peuvent tout faire sur les articles
CREATE POLICY "Articles publics visibles" ON public.articles
  FOR SELECT USING (est_publie = true);

CREATE POLICY "Admins gèrent articles" ON public.articles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin_ca', 'superadmin'))
  );

-- Partenaires:
-- 1. Les partenaires actifs sont visibles par tous
-- 2. Les admins peuvent tout faire sur les partenaires
CREATE POLICY "Partenaires actifs visibles" ON public.partenaires
  FOR SELECT USING (actif = true);

CREATE POLICY "Admins gèrent partenaires" ON public.partenaires
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin_ca', 'superadmin'))
  );
