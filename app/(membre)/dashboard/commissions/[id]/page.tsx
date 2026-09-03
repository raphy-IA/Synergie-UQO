import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  getCommissionDetails,
  getCommissionMembers,
  getCommissionMeetings,
  getCommissionBudgetSummary
} from '@/app/actions/commissions-workspace';
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

  // Fetch tasks for this commission
  const { data: commissionTasks } = await supabase
    .from('taches')
    .select('*')
    .eq('commission_id', params.id)
    .order('created_at', { ascending: false });

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
      meetings={meetingsRes.meetings || []}
      budgetSummary={{
        budgetAnnuel: budgetRes.budgetAnnuel || 0,
        totalDepense: budgetRes.totalDepense || 0,
        soldeDisponible: budgetRes.soldeDisponible || 0,
      }}
      tasks={commissionTasks || []}
      documents={commissionDocs || []}
      forums={commissionForums || []}
      currentUserId={user.id}
    />
  );
}
