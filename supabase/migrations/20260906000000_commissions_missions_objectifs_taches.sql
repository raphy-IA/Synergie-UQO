-- ========================================================
-- Migration: Restructuration Commissions, Missions, Objectifs & Tâches Multi-membres
-- Date: 2026-09-06
-- ========================================================

-- 1. TABLE COMMISSION_MISSIONS (Missions permanentes de la commission)
CREATE TABLE IF NOT EXISTS public.commission_missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commission_id UUID REFERENCES public.commissions(id) ON DELETE CASCADE NOT NULL,
  numero_mission INTEGER NOT NULL,
  titre TEXT NOT NULL,
  description TEXT,
  actif BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(commission_id, numero_mission)
);

CREATE INDEX IF NOT EXISTS idx_commission_missions_comm ON public.commission_missions(commission_id);

-- 2. TABLE COMMISSION_OBJECTIFS (Objectifs stratégiques / opérationnels)
CREATE TABLE IF NOT EXISTS public.commission_objectifs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commission_id UUID REFERENCES public.commissions(id) ON DELETE CASCADE NOT NULL,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  date_debut DATE,
  date_echeance DATE,
  statut VARCHAR(50) DEFAULT 'en_cours' NOT NULL, -- 'en_cours', 'atteint', 'suspendu', 'annule'
  priorite VARCHAR(50) DEFAULT 'moyenne' NOT NULL, -- 'basse', 'moyenne', 'haute'
  cree_par UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_commission_objectifs_comm ON public.commission_objectifs(commission_id);

-- 3. TABLE OBJECTIF_MISSIONS (Liaison Many-to-Many entre Objectif et Missions)
CREATE TABLE IF NOT EXISTS public.objectif_missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  objectif_id UUID REFERENCES public.commission_objectifs(id) ON DELETE CASCADE NOT NULL,
  mission_id UUID REFERENCES public.commission_missions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(objectif_id, mission_id)
);

CREATE INDEX IF NOT EXISTS idx_objectif_missions_obj ON public.objectif_missions(objectif_id);
CREATE INDEX IF NOT EXISTS idx_objectif_missions_miss ON public.objectif_missions(mission_id);

-- 4. ENRICHISSEMENT DE LA TABLE TACHES (Objectif parent & Statistiques agrégées)
ALTER TABLE public.taches
  ADD COLUMN IF NOT EXISTS objectif_id UUID REFERENCES public.commission_objectifs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS progression_globale INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS statut_global VARCHAR(50) DEFAULT 'a_faire' NOT NULL;

CREATE INDEX IF NOT EXISTS idx_taches_objectif ON public.taches(objectif_id);

-- 5. TABLE TACHE_ASSIGNATIONS (Multi-assignation & Progression par membre)
CREATE TABLE IF NOT EXISTS public.tache_assignations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tache_id UUID REFERENCES public.taches(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  est_responsable_principal BOOLEAN DEFAULT FALSE NOT NULL,
  statut_individuel VARCHAR(50) DEFAULT 'a_faire' NOT NULL, -- 'a_faire', 'en_cours', 'termine'
  pourcentage_progression INTEGER DEFAULT 0 NOT NULL, -- 0 à 100
  notes_avancement TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(tache_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_tache_assignations_tache ON public.tache_assignations(tache_id);
CREATE INDEX IF NOT EXISTS idx_tache_assignations_profile ON public.tache_assignations(profile_id);

-- 6. FONCTION ET TRIGGER SQL : CALCUL AUTOMATIQUE DE LA PROGRESSION GLOBALE DES TÂCHES
CREATE OR REPLACE FUNCTION public.fn_recalculer_progression_tache()
RETURNS TRIGGER AS $$
DECLARE
  v_tache_id UUID;
  v_count INTEGER;
  v_avg_progression NUMERIC;
  v_count_termine INTEGER;
  v_count_en_cours INTEGER;
  v_nouveau_statut VARCHAR(50);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_tache_id := OLD.tache_id;
  ELSE
    v_tache_id := NEW.tache_id;
  END IF;

  -- Calcul du nombre total d'assignés
  SELECT COUNT(*), COALESCE(AVG(pourcentage_progression), 0),
         COUNT(*) FILTER (WHERE statut_individuel = 'termine' OR pourcentage_progression = 100),
         COUNT(*) FILTER (WHERE statut_individuel = 'en_cours' OR (pourcentage_progression > 0 AND pourcentage_progression < 100))
  INTO v_count, v_avg_progression, v_count_termine, v_count_en_cours
  FROM public.tache_assignations
  WHERE tache_id = v_tache_id;

  IF v_count = 0 THEN
    v_nouveau_statut := 'a_faire';
    v_avg_progression := 0;
  ELSIF v_count_termine = v_count THEN
    v_nouveau_statut := 'termine';
    v_avg_progression := 100;
  ELSIF v_count_en_cours > 0 OR v_count_termine > 0 THEN
    v_nouveau_statut := 'en_cours';
  ELSE
    v_nouveau_statut := 'a_faire';
  END IF;

  UPDATE public.taches
  SET progression_globale = ROUND(v_avg_progression),
      statut_global = v_nouveau_statut,
      updated_at = NOW()
  WHERE id = v_tache_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_recalculer_progression_tache ON public.tache_assignations;

CREATE TRIGGER trg_recalculer_progression_tache
AFTER INSERT OR UPDATE OR DELETE ON public.tache_assignations
FOR EACH ROW EXECUTE FUNCTION public.fn_recalculer_progression_tache();

-- 7. SEEDING / MISE À JOUR DES OBJECTIFS ET DES 12 MISSIONS OFFICIELLES DES 4 COMMISSIONS PERMANENTES

-- Mettre à jour les objectifs globaux des commissions permanentes
UPDATE public.commissions
SET objectifs = 'Promouvoir l''image de marque de Synergie UQO auprès des membres, de l''université et du public, développer et entretenir des partenariats stratégiques (entreprises, universités, organismes publics/privés), négocier des avantages pour les membres et sécuriser des collaborations et commandites.'
WHERE code_systeme = 'comm_partenariats';

UPDATE public.commissions
SET objectifs = 'La Commission média est chargée de produire, gérer et diffuser les contenus médiatiques de l’association. Elle assure la couverture des activités, la gestion des plateformes numériques, la création des supports visuels et audiovisuels, ainsi que l’archivage des contenus. Elle travaille en collaboration avec la Commission des relations publiques afin de promouvoir l’image, les valeurs et les objectifs de l’association.'
WHERE code_systeme = 'comm_communication';

UPDATE public.commissions
SET objectifs = 'La Commission évènementielle et intégration est chargée de planifier, organiser et coordonner les activités de l’association. Elle veille à l’accueil et à l’intégration des nouveaux membres, favorise la cohésion entre les membres et contribue au renforcement du sentiment d’appartenance. Elle travaille en collaboration avec le Bureau exécutif et les autres commissions afin d’assurer la réussite des événements sociaux, professionnels, éducatifs et communautaires de l’association.'
WHERE code_systeme = 'comm_evenements';

UPDATE public.commissions
SET objectifs = 'Identifier et accompagner les membres en situation de difficulté (sociale, financière, académique ou personnelle), gérer en toute confidentialité le Fonds de Solidarité, piloter les actions d''entraide, de parrainage et de soutien et lutter contre l''isolement communautaire.'
WHERE code_systeme = 'comm_solidarite';

-- Fonction Helper temporaire pour alimenter les missions
DO $$
DECLARE
  v_comm_rp UUID;
  v_comm_media UUID;
  v_comm_evt UUID;
  v_comm_solidarite UUID;
BEGIN
  SELECT id INTO v_comm_rp FROM public.commissions WHERE code_systeme = 'comm_partenariats';
  SELECT id INTO v_comm_media FROM public.commissions WHERE code_systeme = 'comm_communication';
  SELECT id INTO v_comm_evt FROM public.commissions WHERE code_systeme = 'comm_evenements';
  SELECT id INTO v_comm_solidarite FROM public.commissions WHERE code_systeme = 'comm_solidarite';

  -- 1. Commission Relations Publiques & Partenariats
  IF v_comm_rp IS NOT NULL THEN
    INSERT INTO public.commission_missions (commission_id, numero_mission, titre, description) VALUES
    (v_comm_rp, 1, 'Promouvoir l’image de l’association', 'Promouvoir l’image de l’association auprès des membres, des étudiants, des diplômés, de l’UQO, des partenaires et du public.'),
    (v_comm_rp, 2, 'Communication interne et externe', 'Assurer la communication interne et externe, notamment la diffusion des annonces, activités, formations, conférences, offres d’emploi et opportunités.'),
    (v_comm_rp, 3, 'Relations partenariales', 'Développer et entretenir les relations avec les partenaires : entreprises, universités, organismes publics, organismes privés et autres associations.'),
    (v_comm_rp, 4, 'Visibilité multi-canaux', 'Gérer la visibilité de l’association sur les réseaux sociaux, les plateformes numériques, les affiches, les communiqués et autres supports de communication.'),
    (v_comm_rp, 5, 'Mobilisation des membres', 'Mobiliser les membres autour des activités sociales, professionnelles, entrepreneuriales et communautaires.'),
    (v_comm_rp, 6, 'Valorisation des réussites', 'Valoriser les réalisations des membres : réussites professionnelles, projets entrepreneuriaux, initiatives solidaires ou contributions à la communauté.'),
    (v_comm_rp, 7, 'Appui promotionnel aux événements', 'Appuyer l’organisation des événements en assurant la promotion, les invitations, les relations avec les invités et la couverture médiatique ou numérique.'),
    (v_comm_rp, 8, 'Recherche de collaborations', 'Rechercher des occasions de collaboration avec des institutions, entreprises et organismes pouvant soutenir les objectifs de l’association.'),
    (v_comm_rp, 9, 'Cohérence de la communication publique', 'Veiller à la cohérence des messages publics avec les valeurs de respect, d’intégrité, de transparence, de solidarité et de responsabilité.'),
    (v_comm_rp, 10, 'Production de contenus officiels', 'Produire des contenus de communication tels que communiqués, publications, bulletins d’information, rapports d’activités et messages officiels.'),
    (v_comm_rp, 11, 'Renforcement du sentiment d’appartenance', 'Renforcer le sentiment d’appartenance entre anciens étudiants, nouveaux diplômés et étudiants actuels.'),
    (v_comm_rp, 12, 'Appui au porte-parole officiel', 'Servir de porte-parole ou d’appui au porte-parole officiel, selon les orientations du Bureau exécutif ou du Conseil d’administration.')
    ON CONFLICT (commission_id, numero_mission) DO UPDATE SET
      titre = EXCLUDED.titre,
      description = EXCLUDED.description;
  END IF;

  -- 2. Commission Communication, Marketing & Média
  IF v_comm_media IS NOT NULL THEN
    INSERT INTO public.commission_missions (commission_id, numero_mission, titre, description) VALUES
    (v_comm_media, 1, 'Production visuelle et audiovisuelle', 'Produire les contenus visuels et audiovisuels de l’association : photos, vidéos, affiches, capsules, entrevues, témoignages et supports promotionnels.'),
    (v_comm_media, 2, 'Couverture médiatique des activités', 'Couvrir les activités de l’association : conférences, formations, rencontres, assemblées générales, événements sociaux, activités de mentorat et projets communautaires.'),
    (v_comm_media, 3, 'Gestion des plateformes numériques', 'Gérer les plateformes numériques de l’association, notamment les pages Facebook, LinkedIn, Instagram, YouTube, site Web ou autres canaux officiels.'),
    (v_comm_media, 4, 'Publication régulière d’opportunités', 'Créer et publier des contenus réguliers pour informer les membres sur les activités, opportunités d’emploi, stages, formations, appels à projets et nouvelles importantes.'),
    (v_comm_media, 5, 'Portraits et témoignages de membres', 'Valoriser les membres et leurs réalisations à travers des portraits, entrevues, témoignages, publications et reportages.'),
    (v_comm_media, 6, 'Archivage médiatique', 'Assurer l’archivage médiatique des activités de l’association : photos, vidéos, enregistrements, visuels, documents promotionnels et publications importantes.'),
    (v_comm_media, 7, 'Appui aux campagnes de visibilité', 'Appuyer la commission des relations publiques dans la préparation des communiqués, campagnes de visibilité et messages officiels.'),
    (v_comm_media, 8, 'Qualité et charte de l’image numérique', 'Veiller à la qualité et à la cohérence de l’image numérique de l’association, en respectant son identité, ses valeurs et ses objectifs.'),
    (v_comm_media, 9, 'Supports de communication événementiels', 'Préparer des supports de communication pour les événements : invitations numériques, bannières, programmes, présentations, capsules promotionnelles et visuels de campagne.'),
    (v_comm_media, 10, 'Diffusion rapide des informations', 'Assurer la diffusion rapide et professionnelle des informations auprès des membres et du public, en coordination avec le Bureau exécutif.'),
    (v_comm_media, 11, 'Protection de la réputation numérique', 'Protéger l’image et la réputation numérique de l’association en évitant la diffusion de contenus non validés, sensibles ou contraires aux valeurs de l’association.'),
    (v_comm_media, 12, 'Visibilité des projets des membres', 'Contribuer à la visibilité des projets entrepreneuriaux, professionnels et solidaires portés par les membres.')
    ON CONFLICT (commission_id, numero_mission) DO UPDATE SET
      titre = EXCLUDED.titre,
      description = EXCLUDED.description;
  END IF;

  -- 3. Commission Événementielle & Intégration
  IF v_comm_evt IS NOT NULL THEN
    INSERT INTO public.commission_missions (commission_id, numero_mission, titre, description) VALUES
    (v_comm_evt, 1, 'Planification et organisation des événements', 'Planifier et organiser les événements de l’association : rencontres, conférences, assemblées, formations, ateliers, activités sociales, culturelles et professionnelles.'),
    (v_comm_evt, 2, 'Intégration des nouveaux membres', 'Faciliter l’intégration des nouveaux membres, notamment les nouveaux étudiants, diplômés et anciens membres qui rejoignent l’association.'),
    (v_comm_evt, 3, 'Accueil et orientation', 'Mettre en place des activités d’accueil et d’orientation pour présenter l’association, ses objectifs, ses valeurs, ses services et ses opportunités.'),
    (v_comm_evt, 4, 'Cohésion et animation communautaire', 'Favoriser la cohésion et le sentiment d’appartenance entre les membres à travers des rencontres conviviales, activités de réseautage et événements communautaires.'),
    (v_comm_evt, 5, 'Inter-collaboration inter-commissions', 'Collaborer avec les autres commissions pour assurer la réussite des événements, notamment la commission média, la commission des relations publiques et le Bureau exécutif.'),
    (v_comm_evt, 6, 'Logistique événementielle complète', 'Préparer la logistique des activités : choix des lieux, calendrier, invitations, inscriptions, matériel, accueil des participants et coordination sur place.'),
    (v_comm_evt, 7, 'Calendrier annuel d’activités', 'Proposer un calendrier annuel d’activités en lien avec la mission de l’association : entraide, mentorat, insertion professionnelle, entrepreneuriat et solidarité.'),
    (v_comm_evt, 8, 'Mobilisation active aux projets', 'Encourager la participation active des membres aux événements et aux projets de l’association.'),
    (v_comm_evt, 9, 'Analyse des besoins d’intégration', 'Identifier les besoins des nouveaux membres afin de mieux les accompagner dans leur intégration sociale, académique, professionnelle ou communautaire.'),
    (v_comm_evt, 10, 'Activité de mentorat et réseautage', 'Organiser des activités de mentorat et de réseautage entre anciens étudiants, nouveaux diplômés et étudiants actuels.'),
    (v_comm_evt, 11, 'Évaluation et rétroaction des activités', 'Évaluer les activités réalisées en recueillant les commentaires des participants et en proposant des améliorations.'),
    (v_comm_evt, 12, 'Respect de l’éthique associative', 'Veiller au respect des valeurs de l’association lors des événements : respect, solidarité, transparence, responsabilité et esprit d’entraide.')
    ON CONFLICT (commission_id, numero_mission) DO UPDATE SET
      titre = EXCLUDED.titre,
      description = EXCLUDED.description;
  END IF;

  -- 4. Commission Entraide, Inclusion & Solidarité
  IF v_comm_solidarite IS NOT NULL THEN
    INSERT INTO public.commission_missions (commission_id, numero_mission, titre, description) VALUES
    (v_comm_solidarite, 1, 'Suivi des membres en difficulté', 'Identifier et suivre les dossiers des membres nécessitant un accompagnement particulier, notamment en cas de difficulté sociale, financière, académique, professionnelle ou personnelle.'),
    (v_comm_solidarite, 2, 'Réception et analyse des demandes d’aide', 'Recevoir et analyser les demandes d’aide ou de soutien adressées à l’association par les membres.'),
    (v_comm_solidarite, 3, 'Recommandation des mesures de soutien', 'Proposer au Bureau exécutif ou au Conseil d’administration des mesures d’accompagnement adaptées aux situations présentées.'),
    (v_comm_solidarite, 4, 'Gestion du Fonds de Solidarité', 'Gérer, en collaboration avec le Trésorier, le fonds de solidarité destiné à soutenir les membres confrontés à des difficultés exceptionnelles.'),
    (v_comm_solidarite, 5, 'Critères d’équité et transparence', 'Établir des critères transparents d’attribution de l’aide, afin d’assurer l’équité, la confidentialité et la bonne gestion des ressources.'),
    (v_comm_solidarite, 6, 'Organisation d’actions solidaires', 'Organiser des actions de solidarité en faveur des membres ou de la communauté, notamment des collectes, campagnes de soutien, visites, accompagnements ou initiatives sociales.'),
    (v_comm_solidarite, 7, 'Confidentialité et dignité des membres', 'Assurer la confidentialité des dossiers traités et protéger la dignité des membres concernés.'),
    (v_comm_solidarite, 8, 'Réseau d’entraide entre membres', 'Favoriser l’entraide entre les membres en mettant en relation ceux qui peuvent offrir un appui avec ceux qui en ont besoin.'),
    (v_comm_solidarite, 9, 'Orientation inter-commissions', 'Collaborer avec les autres commissions pour orienter les membres vers les opportunités professionnelles, sociales, académiques ou communautaires disponibles.'),
    (v_comm_solidarite, 10, 'Rapport confidentiel de gestion', 'Produire un rapport périodique confidentiel sur les dossiers suivis, les actions menées et les recommandations à soumettre au Bureau exécutif.'),
    (v_comm_solidarite, 11, 'Ethique et intégrité de la solidarité', 'Veiller au respect des valeurs de solidarité, de responsabilité, de transparence et d’intégrité dans toutes les actions d’aide.'),
    (v_comm_solidarite, 12, 'Lutte contre l’isolement', 'Contribuer à la prévention de l’isolement des membres en encourageant l’écoute, l’accompagnement et la présence communautaire.')
    ON CONFLICT (commission_id, numero_mission) DO UPDATE SET
      titre = EXCLUDED.titre,
      description = EXCLUDED.description;
  END IF;
END $$;

-- 8. POLITIQUES RLS SUR LES NOUVELLES TABLES
ALTER TABLE public.commission_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_objectifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectif_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tache_assignations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Missions lisibles par connectes" ON public.commission_missions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Missions gerables par admins" ON public.commission_missions FOR ALL USING (public.est_admin(auth.uid()));

CREATE POLICY "Objectifs lisibles par connectes" ON public.commission_objectifs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Objectifs gerables par membres et admins" ON public.commission_objectifs FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Objectif_Missions lisibles par connectes" ON public.objectif_missions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Objectif_Missions gerables par connectes" ON public.objectif_missions FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Assignations lisibles par connectes" ON public.tache_assignations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Assignations gerables par connectes" ON public.tache_assignations FOR ALL USING (auth.uid() IS NOT NULL);
