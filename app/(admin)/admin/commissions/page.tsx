import React from 'react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CreateCommissionWrapper from '@/components/admin/CreateCommissionWrapper';

import { ensureSystemCommissionsExist } from '@/app/actions/commissions-workspace';

export const dynamic = 'force-dynamic';

export default async function CommissionsPage() {
  const supabase = createClient();

  try {
    await ensureSystemCommissionsExist();
  } catch (e) {
    console.warn("ensureSystemCommissionsExist warning:", e);
  }
  
  // Try fetching with the requested format
  const { data: commissions, error } = await supabase
    .from('commissions')
    .select(`
      *,
      responsable:profiles!responsable_id(prenom, nom),
      membres:commission_membres(count)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching commissions:', error);
  }

  const { data: members } = await supabase
    .from('profiles')
    .select('id, prenom, nom')
    .order('nom');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Commissions</h1>
          <p className="text-slate-600">Gérez les commissions et groupes de travail.</p>
        </div>
        <CreateCommissionWrapper members={members || []} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {commissions?.map((comm) => (
          <Link key={comm.id} href={`/admin/commissions/${comm.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{comm.nom}</CardTitle>
                  <Badge>{comm.statut || 'Actif'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-gray-500 line-clamp-2">{comm.description}</p>
                <div className="text-sm mt-4">
                  <strong>Responsable :</strong> {comm.responsable ? `${comm.responsable.prenom} ${comm.responsable.nom}` : 'Aucun'}
                </div>
                <div className="text-sm">
                  <strong>Membres :</strong> {comm.membres?.[0]?.count || 0}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Créée le {new Date(comm.created_at).toLocaleDateString('fr-CA')}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {(!commissions || commissions.length === 0) && (
          <div className="col-span-full py-10 text-center text-gray-500 bg-white rounded-lg border border-dashed">
            Aucune commission trouvée.
          </div>
        )}
      </div>
    </div>
  );
}
