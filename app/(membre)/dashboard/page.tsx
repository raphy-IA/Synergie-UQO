import React from 'react';
import { createClient } from '@/lib/supabase/server';
import MemberCardQR from '@/components/dashboard/MemberCardQR';
import PaymentButton from '@/components/dashboard/PaymentButton';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

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

  const isApproved = profile.statut_adhesion === 'approuve';
  const isPendingApproval = profile.statut_adhesion === 'en_attente_approbation';
  const isPendingPayment = profile.statut_adhesion === 'en_attente_paiement';
  const isRejected = profile.statut_adhesion === 'rejete';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Espace Membre</h1>
        <p className="text-slate-600">Gérez votre profil, vos cotisations, et accédez à votre carte virtuelle.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Card or Status Banner */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Votre carte numérique</h2>

          {isApproved && (
            <>
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
            </>
          )}

          {isPendingApproval && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3 text-amber-850">
                <Clock className="w-8 h-8 flex-shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <h3 className="font-bold text-lg text-amber-950">Candidature en cours d'examen</h3>
                  <p className="text-sm text-amber-800 mt-1">
                    Votre inscription a bien été reçue. Le Conseil d'Administration de Synergie UQO examine actuellement votre dossier.
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed border-t pt-3">
                Vous recevrez une notification par courriel dès que les administrateurs auront validé votre demande (généralement sous 24 à 48 heures). Une fois approuvé, vous pourrez régler votre cotisation pour activer votre carte de membre.
              </p>
            </div>
          )}

          {isPendingPayment && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-6">
              <div className="flex items-start gap-3 text-blue-900">
                <CheckCircle2 className="w-8 h-8 flex-shrink-0 text-emerald-500 mt-0.5" />
                <div>
                  <h3 className="font-bold text-lg text-blue-950">Candidature approuvée par le CA ! 🎉</h3>
                  <p className="text-sm text-blue-800 mt-1">
                    Félicitations, votre demande a été acceptée. Veuillez régler votre cotisation annuelle réglementaire pour activer votre carte de membre virtuelle et générer votre QR code.
                  </p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <PaymentButton />
              </div>
            </div>
          )}

          {isRejected && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3 text-red-950">
                <XCircle className="w-8 h-8 flex-shrink-0 text-red-500 mt-0.5" />
                <div>
                  <h3 className="font-bold text-lg text-red-950">Candidature refusée</h3>
                  <p className="text-sm text-red-800 mt-1">
                    Le Conseil d'Administration n'a pas pu valider votre dossier d'adhésion. Un motif vous a été envoyé par courriel.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Info Recap */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Informations d'Adhésion</h2>
          <hr />
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Statut d'adhésion :</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                profile.statut_adhesion === 'approuve' ? 'bg-emerald-100 text-emerald-800' :
                profile.statut_adhesion === 'en_attente_paiement' ? 'bg-blue-100 text-blue-800' :
                profile.statut_adhesion === 'en_attente_approbation' ? 'bg-amber-100 text-amber-800' :
                'bg-red-100 text-red-800'
              }`}>
                {profile.statut_adhesion === 'approuve' ? 'Approuvé (En règle)' :
                 profile.statut_adhesion === 'en_attente_paiement' ? 'Approuvé (Attente paiement)' :
                 profile.statut_adhesion === 'en_attente_approbation' ? "En examen par le CA" :
                 "Candidature refusée"}
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
            {profile.date_expiration_adhesion && (
              <div className="flex justify-between">
                <span className="text-slate-500">Date d'expiration :</span>
                <span className="font-semibold text-slate-800">
                  {new Date(profile.date_expiration_adhesion).toLocaleDateString('fr-CA')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
