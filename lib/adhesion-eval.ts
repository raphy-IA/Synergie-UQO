export interface AdhesionGraceSettings {
  delai_grace_adhesion_jours: number;
  delai_grace_renouvellement_jours: number;
  duree_validite_cotisation_jours: number;
}

export function evaluateMemberGracePeriod(
  profile: {
    statut_adhesion: string;
    date_expiration_adhesion?: string | null;
    date_approbation_adhesion?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
    categorie?: string;
  },
  settings: AdhesionGraceSettings
) {
  const now = new Date();

  // 1. Membre d'honneur exempté
  if (profile.categorie === 'honneur') {
    return {
      isValid: true,
      isInGrace: false,
      isBlocked: false,
      graceType: null,
      daysRemainingInGrace: null,
      badgeStatus: 'valide',
      label: "Membre d'Honneur (Actif)",
    };
  }

  // 2. CAS : statut = 'en_attente_approbation' (Inscrit, en attente de décision du CA)
  // Le délai de grâce ne s'applique PAS encore et le membre n'est PAS suspendu pour impayé.
  if (profile.statut_adhesion === 'en_attente_approbation') {
    return {
      isValid: false,
      isInGrace: false,
      isBlocked: false, // Non bloqué par le délai de grâce (en examen par le CA)
      graceType: null,
      daysRemainingInGrace: null,
      badgeStatus: 'attente_approbation',
      label: "En attente d'approbation par le CA",
    };
  }

  // 3. CAS : statut = 'approuve' (Cotisation réglée, adhésion active pour 1 an)
  if (profile.statut_adhesion === 'approuve') {
    const expirationDate = profile.date_expiration_adhesion ? new Date(profile.date_expiration_adhesion) : null;

    if (!expirationDate || now <= expirationDate) {
      return {
        isValid: true,
        isInGrace: false,
        isBlocked: false,
        graceType: null,
        daysRemainingInGrace: null,
        badgeStatus: 'valide',
        label: "Actif — Cotisation à jour",
      };
    }

    // Expiration annuelle atteinte -> Période de grâce de renouvellement (ex: 14 jours)
    const renewalGraceLimit = new Date(expirationDate.getTime() + settings.delai_grace_renouvellement_jours * 24 * 60 * 60 * 1000);
    const msRemaining = renewalGraceLimit.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

    if (now <= renewalGraceLimit) {
      return {
        isValid: true,
        isInGrace: true,
        isBlocked: false,
        graceType: 'renouvellement',
        daysRemainingInGrace: daysRemaining,
        badgeStatus: 'grace',
        label: `Période de grâce de renouvellement (${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''})`,
      };
    }

    // Délai de grâce de renouvellement dépassé -> BLOQUÉ & BADGE INVALIDÉ
    return {
      isValid: false,
      isInGrace: false,
      isBlocked: true,
      graceType: 'renouvellement_expire',
      daysRemainingInGrace: 0,
      badgeStatus: 'invalide',
      label: "Adhésion expirée — Délai de grâce de renouvellement dépassé",
    };
  }

  // 4. CAS : statut = 'en_attente_paiement' (Adhésion approuvée par le CA, en attente de la 1ère cotisation)
  if (profile.statut_adhesion === 'en_attente_paiement') {
    // Le délai de grâce démarre STRICTEMENT à partir de la date d'approbation par le CA
    // (Utilise date_approbation_adhesion, ou fallback sur updated_at / now, JAMAIS created_at)
    const approvalDate = profile.date_approbation_adhesion
      ? new Date(profile.date_approbation_adhesion)
      : (profile.updated_at ? new Date(profile.updated_at) : new Date());

    const adhesionGraceLimit = new Date(approvalDate.getTime() + settings.delai_grace_adhesion_jours * 24 * 60 * 60 * 1000);
    const msRemaining = adhesionGraceLimit.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

    if (now <= adhesionGraceLimit) {
      return {
        isValid: true,
        isInGrace: true,
        isBlocked: false,
        graceType: 'adhesion',
        daysRemainingInGrace: daysRemaining,
        badgeStatus: 'grace',
        label: `En période de grâce d'adhésion (${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} pour cotiser)`,
      };
    }

    // Délai de grâce d'adhésion dépassé -> BLOQUÉ & BADGE INVALIDÉ
    return {
      isValid: false,
      isInGrace: false,
      isBlocked: true,
      graceType: 'adhesion_expiree',
      daysRemainingInGrace: 0,
      badgeStatus: 'invalide',
      label: "Candidature approuvée mais délai de grâce de 1ère cotisation dépassé",
    };
  }

  // 5. Autre statut (rejete, suspendu)
  return {
    isValid: false,
    isInGrace: false,
    isBlocked: true,
    graceType: null,
    daysRemainingInGrace: 0,
    badgeStatus: 'invalide',
    label: profile.statut_adhesion === 'suspendu' ? "Accès suspendu" : "Candidature rejetée",
  };
}
