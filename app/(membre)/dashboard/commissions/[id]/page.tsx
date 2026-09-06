import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import {
  getCommissionDetails,
  getCommissionMembers,
  getCommissionMeetings,
  getCommissionBudgetSummary,
  getCommissionMissions,
  getCommissionObjectifs
} from '@/app/actions/commissions-workspace';
import { getCommissionTasks } from '@/app/actions/taches';
import CommissionWorkspaceClient from './CommissionWorkspaceClient';

export const dynamic = 'force-dynamic';

export default async function CommissionWorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const detailsRes = await getCommissionDetails(params.id);
  if (!detailsRes.success || !detailsRes.commission) {
    notFound();
  }

  if (!detailsRes.isMember) {
    redirect('/dashboard/commissions');
  }

  const membersRes = await getCommissionMembers(params.id);
  const meetingsRes = await getCommissionMeetings(params.id);
  const budgetRes = await getCommissionBudgetSummary(params.id);
  const missionsRes = await getCommissionMissions(params.id);
  const objectifsRes = await getCommissionObjectifs(params.id);
  const tasksRes = await getCommissionTasks(params.id);

  // Fetch documents for this commission
  const { data: commissionDocs } = await supabase
    .from('documents')
    .select('*')
    .eq('commission_id', params.id)
    .order('created_at', { ascending: false });

  // Fetch forum subjects for this commission
  const { data: commissionForums } = await supabase
    .from('forum_sujets')
    .select(`
      *,
      profiles (prenom, nom)
    `)
    .eq('commission_id', params.id)
    .order('created_at', { ascending: false });

  return (
    <CommissionWorkspaceClient
      commission={detailsRes.commission}
      responsableProfile={detailsRes.responsableProfile}
      responsableAdjointProfile={detailsRes.responsableAdjointProfile}
      userRole={detailsRes.userRole}
      isMember={detailsRes.isMember}
      isLeader={detailsRes.isLeader}
      members={membersRes.members || []}
      missions={missionsRes.missions || []}
      objectifs={objectifsRes.objectifs || []}
      meetings={meetingsRes.meetings || []}
      budgetSummary={{
        budgetAnnuel: budgetRes.budgetAnnuel || 0,
        totalDepense: budgetRes.totalDepense || 0,
        soldeDisponible: budgetRes.soldeDisponible || 0,
      }}
      tasks={tasksRes.tasks || []}
      documents={commissionDocs || []}
      forums={commissionForums || []}
      currentUserId={user.id}
    />
  );
}
