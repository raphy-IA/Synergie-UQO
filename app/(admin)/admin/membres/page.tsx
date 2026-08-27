import React from 'react';
import { createClient } from '@/lib/supabase/server';
import MemberList from '@/components/admin/MemberList';

export const dynamic = 'force-dynamic';

export default async function MembresPage() {
  const supabase = createClient();

  const { data: members, error } = await supabase
    .from('profiles')
    .select('id, prenom, nom, email, telephone, role, categorie, statut_adhesion, programme_etudes, matricule_uqo, created_at')
    .order('created_at', { ascending: false });

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
