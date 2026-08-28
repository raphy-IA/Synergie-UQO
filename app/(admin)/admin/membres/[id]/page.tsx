import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import MemberDetailAdmin from '@/components/admin/MemberDetailAdmin';

export const dynamic = 'force-dynamic';

export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !profile) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <MemberDetailAdmin profile={profile} />
    </div>
  );
}
