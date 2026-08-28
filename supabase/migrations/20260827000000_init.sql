-- Migration SQL pour Synergie UQO (Enrichie)

-- ENUMS
CREATE TYPE role_utilisateur AS ENUM ('membre', 'admin_ca', 'tresorier', 'superadmin');
CREATE TYPE categorie_membre AS ENUM (
  'etudiant',
  'diplome',
  'ancien',
  'associe',
  'honneur',
  'professionnel_diplome',
  'professionnel_etudiant'
);
CREATE TYPE statut_adhesion AS ENUM ('en_attente_paiement', 'en_attente_approbation', 'approuve', 'rejete', 'suspendu');
CREATE TYPE categorie_article AS ENUM ('education', 'carriere', 'entrepreneuriat', 'politiques_lois', 'vie_associative');
CREATE TYPE statut_commission AS ENUM ('active', 'terminee', 'suspendue');

-- 1. PROFILES (Lié à auth.users de Supabase)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  telephone VARCHAR(30),
  role role_utilisateur DEFAULT 'membre' NOT NULL,
  categorie categorie_membre NOT NULL,

  -- Parcours académique
  programme_etudes VARCHAR(255),
  matricule_uqo VARCHAR(50),
  niveau_etudes VARCHAR(100),          -- 'Baccalauréat', 'Maîtrise', 'Doctorat', 'Certificat', 'DESS'
  domaine_etudes VARCHAR(255),         -- Ex: 'Sciences informatiques', 'Administration'
  annee_diplome INTEGER,               -- Année d'obtention du diplôme
  universite_origine VARCHAR(255),     -- Si différent de UQO

  -- Parcours professionnel
  poste_actuel VARCHAR(255),           -- Ex: 'Développeur Senior', 'Analyste financier'
  employeur VARCHAR(255),              -- Ex: 'CGI', 'Gouvernement du Canada'
  secteur_activite VARCHAR(255),       -- Ex: 'Technologies de l information', 'Finance'
  expertises TEXT,                     -- Compétences clés (texte libre)
  site_web VARCHAR(255),               -- Site web personnel/portfolio

  -- Informations complémentaires
  bio TEXT,
  linkedin_url VARCHAR(255),
  avatar_url TEXT,
  ville VARCHAR(100),
  pays VARCHAR(100) DEFAULT 'Canada',

  -- Rôle associatif (poste dans l'association, distinct du rôle système)
  poste_association VARCHAR(100),      -- 'president', 'vice_president', 'secretaire', etc.
  date_debut_mandat DATE,
  date_fin_mandat DATE,

  -- Préférences
  notifications_email BOOLEAN DEFAULT true NOT NULL,
  profil_public BOOLEAN DEFAULT false NOT NULL,

  -- Adhésion
  statut_adhesion statut_adhesion DEFAULT 'en_attente_paiement' NOT NULL,
  date_expiration_adhesion TIMESTAMP WITH TIME ZONE,
  consentement_loi_25 BOOLEAN DEFAULT false NOT NULL,
  qr_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,

  -- Timestamps
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

-- 5. COMMISSIONS
CREATE TABLE public.commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  description TEXT,
  objectifs TEXT,
  date_creation DATE DEFAULT CURRENT_DATE NOT NULL,
  date_fin DATE,                        -- NULL = commission permanente
  statut statut_commission DEFAULT 'active' NOT NULL,
  responsable_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. COMMISSION_MEMBRES (Many-to-Many)
CREATE TABLE public.commission_membres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commission_id UUID REFERENCES public.commissions(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role_commission VARCHAR(100) DEFAULT 'membre' NOT NULL, -- 'president', 'secretaire', 'membre'
  date_adhesion DATE DEFAULT CURRENT_DATE NOT NULL,
  actif BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(commission_id, profile_id)
);

-- INDEX pour performances
CREATE INDEX idx_profiles_statut ON public.profiles(statut_adhesion);
CREATE INDEX idx_profiles_categorie ON public.profiles(categorie);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_commission_membres_commission ON public.commission_membres(commission_id);
CREATE INDEX idx_commission_membres_profile ON public.commission_membres(profile_id);

-- Helper function to check if user is admin (runs with SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.est_admin(user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role IN ('admin_ca', 'superadmin', 'tresorier')
  );
END;
$$ LANGUAGE plpgsql;

-- RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partenaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_membres ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Profils lisibles par soi et admins" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR public.est_admin(auth.uid())
  );

CREATE POLICY "Profils insérables par le propriétaire" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

CREATE POLICY "Profils modifiables par soi et admins" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR public.est_admin(auth.uid())
  );

-- Paiements Policies
CREATE POLICY "Paiements lisibles par soi et admins" ON public.paiements
  FOR SELECT USING (
    auth.uid() = profile_id OR public.est_admin(auth.uid())
  );

-- Articles Policies
CREATE POLICY "Articles publics visibles" ON public.articles
  FOR SELECT USING (est_publie = true);

CREATE POLICY "Admins gèrent articles" ON public.articles
  FOR ALL USING (
    public.est_admin(auth.uid())
  );

-- Partenaires Policies
CREATE POLICY "Partenaires actifs visibles" ON public.partenaires
  FOR SELECT USING (actif = true);

CREATE POLICY "Admins gèrent partenaires" ON public.partenaires
  FOR ALL USING (
    public.est_admin(auth.uid())
  );

-- Commissions Policies (tous les membres authentifiés peuvent lire, admins gèrent)
CREATE POLICY "Commissions lisibles par membres" ON public.commissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins gèrent commissions" ON public.commissions
  FOR ALL USING (
    public.est_admin(auth.uid())
  );

-- Commission Membres Policies
CREATE POLICY "Commission membres lisibles par membres" ON public.commission_membres
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins gèrent commission membres" ON public.commission_membres
  FOR ALL USING (
    public.est_admin(auth.uid())
  );
