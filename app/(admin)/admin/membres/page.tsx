import React from 'react';
import { createClient } from '@/lib/supabase/server';
import MemberList from '@/components/admin/MemberList';

export const dynamic = 'force-dynamic';

export default async function MembresPage() {
  const supabase = createClient();

  // 1. Récupérer le rôle de l'utilisateur connecté
  const { data: { user } } = await supabase.auth.getUser();
  let callerRole = 'membre';
  if (user) {
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (callerProfile) callerRole = callerProfile.role;
  }

  // 2. Récupérer les membres (en excluant les superadmins si le demandeur n'en est pas un)
  let query = supabase
    .from('profiles')
    .select('id, prenom, nom, email, telephone, role, categorie, statut_adhesion, programme_etudes, matricule_uqo, poste_association, ville, secteur_activite, created_at');

  if (callerRole !== 'superadmin') {
    query = query.neq('role', 'superadmin');
  }

  const { data: members, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching members:', error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Annuaire des Membres</h1>
        <p className="text-slate-600">Consultez la liste des profils enregistrés et exportez les rapports au format CSV.</p>
      </div>

      <MemberList initialMembers={members || []} />
    </div>
  );
}
