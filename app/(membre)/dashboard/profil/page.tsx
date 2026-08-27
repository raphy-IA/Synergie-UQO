import React from 'react';
import { createClient } from '@/lib/supabase/server';
import ProfileForm from '@/components/dashboard/ProfileForm';

export const dynamic = 'force-dynamic';

export default async function ProfilPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('prenom, nom, telephone, bio, linkedin_url')
    .eq('id', user!.id)
    .single();

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Mon Profil</h1>
        <p className="text-slate-600">Mettez à jour vos coordonnées et votre biographie.</p>
      </div>

      <ProfileForm initialProfile={profile} />
    </div>
  );
}
