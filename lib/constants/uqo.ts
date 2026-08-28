export interface UQOProgram {
  name: string;
  level: 'Certificat' | 'Baccalauréat' | 'DESS' | 'Maîtrise' | 'Doctorat';
}

export interface UQODomain {
  id: string;
  name: string;
  programs: UQOProgram[];
}

export const UQO_DOMAINS: UQODomain[] = [
  {
    id: "admin_gestion",
    name: "Administration et Sciences de la gestion",
    programs: [
      { name: "Baccalauréat en administration des affaires (B.A.A.) – Finance", level: "Baccalauréat" },
      { name: "Baccalauréat en administration des affaires (B.A.A.) – Marketing", level: "Baccalauréat" },
      { name: "Baccalauréat en administration des affaires (B.A.A.) – Gestion des ressources humaines", level: "Baccalauréat" },
      { name: "Baccalauréat en administration des affaires (B.A.A.) – Management", level: "Baccalauréat" },
      { name: "Baccalauréat en sciences comptables", level: "Baccalauréat" },
      { name: "Certificat en gestion de projet", level: "Certificat" },
      { name: "Certificat en comptabilité générale", level: "Certificat" },
      { name: "Maîtrise en gestion de projet (MGP)", level: "Maîtrise" },
      { name: "Maîtrise en administration des affaires (MBA)", level: "Maîtrise" }
    ]
  },
  {
    id: "informatique_ingenierie",
    name: "Informatique et Ingénierie",
    programs: [
      { name: "Baccalauréat en informatique – Général", level: "Baccalauréat" },
      { name: "Baccalauréat en informatique – Cybersécurité", level: "Baccalauréat" },
      { name: "Baccalauréat en informatique – Développement logiciel", level: "Baccalauréat" },
      { name: "Baccalauréat en génie informatique", level: "Baccalauréat" },
      { name: "Certificat en informatique", level: "Certificat" },
      { name: "Maîtrise en sciences et technologies de l'information (M.Sc.I.)", level: "Maîtrise" },
      { name: "Doctorat en sciences et technologies de l'information", level: "Doctorat" }
    ]
  },
  {
    id: "education",
    name: "Sciences de l'éducation",
    programs: [
      { name: "Baccalauréat en éducation préscolaire et en enseignement primaire", level: "Baccalauréat" },
      { name: "Baccalauréat en enseignement secondaire", level: "Baccalauréat" },
      { name: "Baccalauréat en enseignement en adaptation scolaire et sociale", level: "Baccalauréat" },
      { name: "Maîtrise en éducation", level: "Maîtrise" }
    ]
  },
  {
    id: "psychologie_psychoed",
    name: "Psychologie et Psychoéducation",
    programs: [
      { name: "Baccalauréat en psychologie", level: "Baccalauréat" },
      { name: "Baccalauréat en psychoéducation", level: "Baccalauréat" },
      { name: "Maîtrise en psychoéducation", level: "Maîtrise" },
      { name: "Doctorat en psychologie (D.Psy. / Ph.D.)", level: "Doctorat" }
    ]
  },
  {
    id: "sciences_sociales_travail_social",
    name: "Sciences sociales et Travail social",
    programs: [
      { name: "Baccalauréat en travail social", level: "Baccalauréat" },
      { name: "Baccalauréat en relations industrielles et ressources humaines", level: "Baccalauréat" },
      { name: "Baccalauréat en sciences sociales", level: "Baccalauréat" },
      { name: "Baccalauréat en communication", level: "Baccalauréat" },
      { name: "Maîtrise en travail social", level: "Maîtrise" }
    ]
  },
  {
    id: "sciences_sante",
    name: "Sciences de la santé",
    programs: [
      { name: "Baccalauréat en sciences infirmières (formation initiale)", level: "Baccalauréat" },
      { name: "Baccalauréat en sciences infirmières (perfectionnement/DEC-BAC)", level: "Baccalauréat" },
      { name: "Certificat en santé mentale", level: "Certificat" },
      { name: "Maîtrise en sciences infirmières / DESS en soins de première ligne", level: "Maîtrise" }
    ]
  },
  {
    id: "arts_design_lettres",
    name: "Arts visuels, Design et Lettres",
    programs: [
      { name: "Baccalauréat en design graphique", level: "Baccalauréat" },
      { name: "Baccalauréat en bande dessinée", level: "Baccalauréat" },
      { name: "Baccalauréat en arts visuels", level: "Baccalauréat" },
      { name: "Baccalauréat en lettres (ou rédaction/traduction)", level: "Baccalauréat" },
      { name: "Maîtrise en muséologie et pratiques des arts", level: "Maîtrise" }
    ]
  },
  {
    id: "sciences_naturelles_env",
    name: "Sciences naturelles et Environnement",
    programs: [
      { name: "Baccalauréat en sciences naturelles", level: "Baccalauréat" },
      { name: "Maîtrise en biologie appliquée (ISFORT)", level: "Maîtrise" },
      { name: "Doctorat en biologie appliquée / sciences de l'environnement", level: "Doctorat" }
    ]
  }
];
