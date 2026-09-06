import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { getTaskDetails } from '@/app/actions/taches';
import TaskDetailClient from './TaskDetailClient';

export const dynamic = 'force-dynamic';

export default async function TaskDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const res = await getTaskDetails(params.id);

  if (!res.success || !res.task) {
    notFound();
  }

  return (
    <TaskDetailClient
      task={res.task}
      currentUserId={user.id}
    />
  );
}
