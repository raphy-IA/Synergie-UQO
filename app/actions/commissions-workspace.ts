'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function ensureSystemCommissionsExist() {
  const supabase = createClient();

  const systemCommissions = [
    {
      code_systeme: 'comm_communication',
      nom: 'Communication & Marketing',
      description: 'Commission permanente chargée de l\'image de marque, des médias sociaux, de la gazette et de la promotion des membres.',
      objectifs: 'Assurer la visibilité de Synergie UQO, concevoir les supports visuels des événements et animer la communauté numérique.',
      est_systeme: true,
      statut: 'active',
      budget_annuel: 1000.00,
    },
    {
      code_systeme: 'comm_partenariats',
      nom: 'Relations Publiques & Partenariats',
      description: 'Commission permanente chargée des commandites, des relations institutionnelles et du réseau des partenaires corporatifs.',
      objectifs: 'Développer des partenariats stratégiques, négocier des avantages statutaires pour les membres et sécuriser des commandites.',
      est_systeme: true,
      statut: 'active',
      budget_annuel: 1500.00,
    },
    {
      code_systeme: 'comm_evenements',
      nom: 'Événements & Intégration',
      description: 'Commission permanente chargée de la conception, de la logistique et de l\'organisation des Assemblées Générales, galas et ateliers.',
      objectifs: 'Organiser des événements d\'intégration et des rencontres de réseautage professionnelles pour la communauté UQO.',
      est_systeme: true,
      statut: 'active',
      budget_annuel: 2000.00,
    },
    {
      code_systeme: 'comm_solidarite',
      nom: 'Entraide, Inclusion & Solidarité',
      description: 'Commission permanente chargée de la gouvernance confidentielle du Fonds de Solidarité, du mentorat et de l\'accueil des nouveaux arrivants.',
      objectifs: 'Analyser les demandes d\'aide financière d\'urgence, piloter le programme de parrainage/mentorat et promouvoir l\'inclusion.',
      est_systeme: true,
      statut: 'active',
      budget_annuel: 2500.00,
    },
  ];

  for (const sysComm of systemCommissions) {
    try {
      // 1. First check if it exists by name or code
      const { data: existing } = await supabase
        .from('commissions')
        .select('id')
        .eq('nom', sysComm.nom)
        .maybeSingle();

      if (!existing) {
        // Try inserting full record
        const { error: insErr } = await supabase
          .from('commissions')
          .insert(sysComm);

        if (insErr) {
          // Fallback if code_systeme or est_systeme columns don't exist yet in remote DB
          await supabase
            .from('commissions')
            .insert({
              nom: sysComm.nom,
              description: sysComm.description,
              objectifs: sysComm.objectifs,
              statut: 'active',
            });
        }
      } else {
        // Ensure est_systeme is marked true if possible
        await supabase
          .from('commissions')
          .update({ est_systeme: true, code_systeme: sysComm.code_systeme })
          .eq('id', existing.id);
      }
    } catch (err) {
      console.warn("Could not auto-seed system commission:", sysComm.nom, err);
    }
  }
}

export async function getCommissionDetails(commissionId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié" };

  // 1. Fetch Commission Info
  const { data: commission, error: commErr } = await supabase
    .from('commissions')
    .select('*')
    .eq('id', commissionId)
    .single();

  if (commErr || !commission) {
    return { error: "Commission introuvable" };
  }

  // 2. Get user role in profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, prenom, nom, role')
    .eq('id', user.id)
    .single();

  const isAdmin = ['admin_ca', 'tresorier', 'superadmin'].includes(profile?.role || '');

  // 3. Get Responsable & Adjoint Profile Details
  let responsableProfile = null;
  let responsableAdjointProfile = null;

  if (commission.responsable_id) {
    const { data: resp } = await supabase
      .from('profiles')
      .select('id, prenom, nom, email, telephone, avatar_url, categorie')
      .eq('id', commission.responsable_id)
      .single();
    responsableProfile = resp;
  }

  if (commission.responsable_adjoint_id) {
    const { data: adj } = await supabase
      .from('profiles')
      .select('id, prenom, nom, email, telephone, avatar_url, categorie')
      .eq('id', commission.responsable_adjoint_id)
      .single();
    responsableAdjointProfile = adj;
  }

  // 4. Check user membership in commission
  const { data: membership } = await supabase
    .from('commission_membres')
    .select('*')
    .eq('commission_id', commissionId)
    .eq('profile_id', user.id)
    .eq('actif', true)
    .maybeSingle();

  const isResponsable = commission.responsable_id === user.id;
  const isAdjoint = commission.responsable_adjoint_id === user.id;

  return {
    success: true,
    commission,
    responsableProfile,
    responsableAdjointProfile,
    userRole: isResponsable
      ? 'Responsable Principal'
      : isAdjoint
      ? 'Responsable Adjoint'
      : membership
      ? membership.role_commission || 'Membre statutaire'
      : isAdmin
      ? 'Superviseur Admin'
      : null,
    isMember: !!membership || isResponsable || isAdjoint || isAdmin,
    isLeader: isResponsable || isAdjoint || isAdmin,
  };
}

export async function getCommissionMembers(commissionId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('commission_membres')
    .select(`
      id,
      role_commission,
      actif,
      created_at,
      profiles:profile_id (
        id,
        prenom,
        nom,
        email,
        telephone,
        categorie,
        avatar_url
      )
    `)
    .eq('commission_id', commissionId)
    .eq('actif', true);

  if (error) {
    return { error: "Impossible de récupérer les membres." };
  }

  return { success: true, members: data || [] };
}

export async function getCommissionMeetings(commissionId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('commission_reunions')
    .select(`
      *,
      organisateur:cree_par (
        prenom,
        nom
      )
    `)
    .eq('commission_id', commissionId)
    .order('date_reunion', { ascending: true });

  if (error) {
    return { error: "Erreur lors du chargement des réunions." };
  }

  return { success: true, meetings: data || [] };
}

export async function createCommissionMeeting(data: {
  commission_id: string;
  titre: string;
  ordre_du_jour?: string;
  date_reunion: string;
  lieu_ou_lien?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié" };

  const { data: meeting, error } = await supabase
    .from('commission_reunions')
    .insert({
      commission_id: data.commission_id,
      titre: data.titre,
      ordre_du_jour: data.ordre_du_jour || null,
      date_reunion: data.date_reunion,
      lieu_ou_lien: data.lieu_ou_lien || null,
      cree_par: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return { error: "Erreur lors de la création de la réunion." };
  }

  revalidatePath(`/dashboard/commissions/${data.commission_id}`);
  return { success: true, meeting };
}

export async function getCommissionBudgetSummary(commissionId: string) {
  const supabase = createClient();

  // 1. Get Commission budget
  const { data: commission } = await supabase
    .from('commissions')
    .select('budget_annuel')
    .eq('id', commissionId)
    .single();

  const budget = commission?.budget_annuel || 0;

  // 2. Get validated expenses linked to this commission
  const { data: depenses } = await supabase
    .from('depenses_remboursements')
    .select('montant, statut')
    .eq('commission_id', commissionId)
    .eq('statut', 'approuve');

  const totalDepense = (depenses || []).reduce((sum, d) => sum + (parseFloat(d.montant) || 0), 0);

  return {
    success: true,
    budgetAnnuel: budget,
    totalDepense,
    soldeDisponible: Math.max(0, budget - totalDepense),
  };
}
