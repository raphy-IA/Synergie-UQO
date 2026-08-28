import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import MemberDetailAdmin from '@/components/admin/MemberDetailAdmin';

export const dynamic = 'force-dynamic';

export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  
  // 1. Fetch current logged-in user profile to check their role
  const { data: { user } } = await supabase.auth.getUser();
  let currentUserRole = 'membre';
  if (user) {
    const { data: currProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (currProfile) {
      currentUserRole = currProfile.role;
    }
  }

  // 2. Fetch the target member profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !profile) {
    notFound();
  }

  // 3. Bloquer l'accès si la cible est superadmin et que le visiteur n'est pas superadmin
  if (profile.role === 'superadmin' && currentUserRole !== 'superadmin') {
    notFound(); // Nous affichons une 404 (non trouvé) pour masquer l'existence même du compte
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <MemberDetailAdmin profile={profile} currentUserRole={currentUserRole} />
    </div>
  );
}
