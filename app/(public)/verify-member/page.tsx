import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

import { getAdhesionGraceSettings, evaluateMemberGracePeriod } from '@/app/actions/adhesion';

export default async function VerifyMemberPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;
  const supabase = createAdminClient();

  let member = null;
  let error = false;
  let graceEvaluation = null;

  if (token) {
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('prenom, nom, categorie, statut_adhesion, date_expiration_adhesion, updated_at, created_at')
      .eq('qr_token', token)
      .maybeSingle();

    if (!fetchError && data) {
      member = data;
      const graceSettings = await getAdhesionGraceSettings();
      graceEvaluation = evaluateMemberGracePeriod(data, graceSettings);
    } else {
      error = true;
    }
  } else {
    error = true;
  }

  const isValid = graceEvaluation ? graceEvaluation.isValid : false;
  const isInGrace = graceEvaluation ? graceEvaluation.isInGrace : false;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <Card className="max-w-md w-full shadow-2xl border-none">
        {/* Valid Member */}
        {isValid && member && (
          <>
            <CardHeader className="bg-emerald-600 text-white text-center rounded-t-lg py-8">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 border border-white/30">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <CardTitle className="text-2xl font-extrabold tracking-tight">Membre en Règle</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-center">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Identité</p>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{member.prenom} {member.nom}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t pt-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Catégorie</p>
                  <p className="font-semibold text-slate-800 capitalize mt-1">{member.categorie}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut</p>
                  <p className={`font-semibold mt-1 ${isInGrace ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {graceEvaluation?.label || 'Actif / Validé'}
                  </p>
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* Expired, Blocked or CA Pending */}
        {member && !isValid && (
          <>
            <CardHeader className="bg-red-600 text-white text-center rounded-t-lg py-8">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 border border-white/30">
                <AlertTriangle className="w-12 h-12 text-white" />
              </div>
              <CardTitle className="text-2xl font-extrabold tracking-tight">Carte Invalide ou Bloquée</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-center">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Identité</p>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{member.prenom} {member.nom}</h3>
              </div>
              <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-sm text-red-900 font-medium">
                {graceEvaluation?.label || "Cette carte de membre n'est pas active ou le délai de grâce est dépassé."}
              </div>
            </CardContent>
          </>
        )}

        {/* Invalid Token / Not Found */}
        {error && !member && (
          <>
            <CardHeader className="bg-red-600 text-white text-center rounded-t-lg py-8">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 border border-white/30">
                <XCircle className="w-12 h-12 text-white" />
              </div>
              <CardTitle className="text-2xl font-extrabold tracking-tight">Carte Invalide</CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center">
              <p className="text-slate-600">
                Le jeton de vérification ne correspond à aucun membre actif de Synergie UQO ou a été révoqué.
              </p>
            </CardContent>
          </>
        )}

        <CardFooter className="bg-slate-50 border-t rounded-b-lg p-4 justify-center">
          <Link href="/" className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            Retour à l'accueil
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
