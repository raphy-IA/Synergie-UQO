import React from 'react';
import { createClient } from '@/lib/supabase/server';
import MemberCardQR from '@/components/dashboard/MemberCardQR';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('prenom, nom, email, categorie, statut_adhesion, qr_token, date_expiration_adhesion')
    .eq('id', user!.id)
    .single();

  if (!profile) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Espace Membre</h1>
        <p className="text-slate-600">Gérez votre profil, vos cotisations, et accédez à votre carte virtuelle.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Card Display */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Votre carte numérique</h2>
          <p className="text-sm text-slate-600">
            Présentez ce QR Code lors des événements ou assemblées générales pour valider votre statut en règle.
          </p>
          <MemberCardQR
            prenom={profile.prenom}
            nom={profile.nom}
            email={profile.email}
            categorie={profile.categorie}
            statut_adhesion={profile.statut_adhesion}
            qr_token={profile.qr_token}
            date_expiration_adhesion={profile.date_expiration_adhesion}
          />
        </div>

        {/* Right: Info Recap */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Informations d'Adhésion</h2>
          <hr />
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Statut d'adhésion :</span>
              <span className="font-semibold text-slate-800 capitalize">
                {profile.statut_adhesion === 'approuve' ? 'Approuvé (En règle)' : 'En attente de validation CA'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Catégorie de membre :</span>
              <span className="font-semibold text-slate-800 capitalize">{profile.categorie}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Courriel de connexion :</span>
              <span className="font-semibold text-slate-800">{profile.email}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
