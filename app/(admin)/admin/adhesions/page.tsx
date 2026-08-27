import React from 'react';
import { createClient } from '@/lib/supabase/server';
import AdhesionReviewList from '@/components/admin/AdhesionReviewList';

export const dynamic = 'force-dynamic';

export default async function AdhesionsPage() {
  const supabase = createClient();
  
  const { data: members, error } = await supabase
    .from('profiles')
    .select('id, email, prenom, nom, telephone, categorie, programme_etudes, matricule_uqo, created_at')
    .eq('statut_adhesion', 'en_attente_approbation')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching pending members:', error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Adhésions en attente</h1>
        <p className="text-slate-600">Révisez et validez les nouvelles adhésions après paiement.</p>
      </div>

      <AdhesionReviewList initialMembers={members || []} />
    </div>
  );
}
