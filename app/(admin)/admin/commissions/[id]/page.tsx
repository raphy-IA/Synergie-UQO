import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import CommissionDetail from '@/components/admin/CommissionDetail';

export const dynamic = 'force-dynamic';

export default async function CommissionDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  
  const { data: commission, error: commError } = await supabase
    .from('commissions')
    .select(`
      *,
      responsable:profiles!responsable_id(id, prenom, nom)
    `)
    .eq('id', params.id)
    .single();

  if (commError || !commission) {
    notFound();
  }

  const { data: commission_membres } = await supabase
    .from('commission_membres')
    .select(`
      id,
      role_commission,
      created_at,
      profile:profiles(id, prenom, nom, email)
    `)
    .eq('commission_id', params.id);

  const { data: members } = await supabase
    .from('profiles')
    .select('id, prenom, nom')
    .order('nom');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <CommissionDetail 
        commission={commission} 
        commissionMembres={commission_membres || []} 
        allMembers={members || []}
      />
    </div>
  );
}
