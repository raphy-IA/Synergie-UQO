import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getReunionDetail } from '@/app/actions/reunions';
import ReunionDetailClient from './ReunionDetailClient';

export const dynamic = 'force-dynamic';

export default async function ReunionDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const reunion = await getReunionDetail(params.id);

  if (!reunion) {
    return (
      <div className="p-8 text-center text-slate-500">
        <h2 className="text-xl font-bold">Réunion non trouvée</h2>
        <p className="text-xs">La réunion demandée n'existe pas ou a été supprimée.</p>
      </div>
    );
  }

  // Fetch all profiles for task assignment & presences management
  const { data: allProfiles } = await supabase.from('profiles').select('id, prenom, nom, email, role, avatar_url').order('prenom');

  return (
    <ReunionDetailClient
      reunion={reunion}
      currentUserId={user.id}
      allProfiles={allProfiles || []}
    />
  );
}
