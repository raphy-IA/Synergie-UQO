import React from 'react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CreateCommissionWrapper from '@/components/admin/CreateCommissionWrapper';
import { Building2, Users, ArrowRight, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import { ensureSystemCommissionsExist } from '@/app/actions/commissions-workspace';

export const dynamic = 'force-dynamic';

export default async function CommissionsPage() {
  const supabase = createClient();

  try {
    await ensureSystemCommissionsExist();
  } catch (e) {
    console.warn("ensureSystemCommissionsExist warning:", e);
  }
  
  // Fetch commissions safely without referencing missing DB columns in SQL
  let commissions: any[] = [];
  const { data: commsData, error: commsErr } = await supabase
    .from('commissions')
    .select(`
      *,
      responsable:profiles!responsable_id(prenom, nom),
      membres:commission_membres(count)
    `)
    .order('created_at', { ascending: false });

  if (commsErr) {
    console.error('Error fetching commissions:', commsErr);
    // Fallback simple query
    const { data: fallbackData } = await supabase.from('commissions').select('*');
    commissions = fallbackData || [];
  } else {
    commissions = commsData || [];
  }

  const { data: members } = await supabase
    .from('profiles')
    .select('id, prenom, nom')
    .order('nom');

  const EXACT_SYSTEM_NAMES = [
    'Communication & Marketing',
    'Relations Publiques & Partenariats',
    'Événements & Intégration',
    'Entraide, Inclusion & Solidarité'
  ];

  const OFFICIAL_SYSTEM_CODES = ['comm_communication', 'comm_partenariats', 'comm_evenements', 'comm_solidarite'];

  const isSystemComm = (c: any) => {
    if (c.est_systeme === true || c.est_systeme === 'true') return true;
    if (c.code_systeme && OFFICIAL_SYSTEM_CODES.includes(c.code_systeme)) return true;
    if (EXACT_SYSTEM_NAMES.includes(c.nom)) return true;
    return false;
  };

  const systemComms = commissions.filter(isSystemComm);
  const customComms = commissions.filter(c => !isSystemComm(c));

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-500 absolute top-0 left-0 right-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 text-blue-900 rounded-2xl">
                <Building2 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Gestion des Commissions</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Pilotez les 4 commissions système statutaires et créez des groupes de travail ad hoc.
            </p>
          </div>
          <CreateCommissionWrapper members={members || []} />
        </div>
      </div>

      {/* SECTION 1: Commissions Système Permanentes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-extrabold text-slate-900">Commissions Système Permanentes</h2>
          </div>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Statutaires</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {systemComms.map((comm) => (
            <Link key={comm.id} href={`/dashboard/commissions/${comm.id}`} className="block group">
              <Card className="shadow-lg hover:shadow-2xl transition-all border border-slate-200/80 rounded-3xl bg-white overflow-hidden flex flex-col justify-between h-full group-hover:border-blue-900">
                <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-lg font-extrabold text-slate-900 leading-snug group-hover:text-blue-900 transition-colors">
                      {comm.nom}
                    </CardTitle>
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-3 py-1 rounded-full border border-amber-200 uppercase tracking-wider shrink-0">
                      🔒 Permanente
                    </span>
                  </div>
                  <CardDescription className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {comm.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs font-medium border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Responsable</span>
                      <strong className="text-slate-800 truncate block mt-0.5">
                        {comm.responsable ? `${comm.responsable.prenom} ${comm.responsable.nom}` : 'Non désigné'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Membres rattachés</span>
                      <strong className="text-slate-800 block mt-0.5">{comm.membres?.[0]?.count || 0} Membre(s)</strong>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold">Budget: ${comm.budget_annuel || 0} CAD</span>
                    <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Accéder à l&apos;Espace de Travail <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* SECTION 2: Commissions Ad Hoc & Personnalisées */}
      <div className="space-y-4 pt-4 border-t border-slate-200/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-900" />
            <h2 className="text-lg font-extrabold text-slate-900">Commissions Personnalisées & Groupes Ad Hoc</h2>
          </div>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{customComms.length} groupe(s)</span>
        </div>

        {customComms.length === 0 ? (
          <div className="p-8 bg-white border border-dashed border-slate-200 rounded-3xl text-center text-xs text-slate-400 italic">
            Aucune commission personnalisée créée pour le moment. Cliquez sur &quot;Créer une commission&quot; ci-dessus pour en ajouter une.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customComms.map((comm) => (
              <Link key={comm.id} href={`/dashboard/commissions/${comm.id}`} className="block group">
                <Card className="shadow-md hover:shadow-xl transition-all border border-slate-200/80 rounded-3xl bg-white overflow-hidden flex flex-col justify-between h-full group-hover:border-blue-900">
                  <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <CardTitle className="text-base font-extrabold text-slate-900 leading-snug group-hover:text-blue-900 transition-colors">
                        {comm.nom}
                      </CardTitle>
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-2.5 py-0.5 rounded-full uppercase border">
                        {comm.statut || 'active'}
                      </span>
                    </div>
                    <CardDescription className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {comm.description || 'Sans description.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3">
                    <div className="text-xs text-slate-700 space-y-1">
                      <p><strong>Responsable :</strong> {comm.responsable ? `${comm.responsable.prenom} ${comm.responsable.nom}` : 'Aucun'}</p>
                      <p><strong>Membres :</strong> {comm.membres?.[0]?.count || 0}</p>
                    </div>
                    <div className="flex justify-end pt-2 text-xs font-extrabold text-blue-900 items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Ouvrir <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
