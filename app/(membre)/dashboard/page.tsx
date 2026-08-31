import React from 'react';
import { createClient } from '@/lib/supabase/server';
import MemberCardQR from '@/components/dashboard/MemberCardQR';
import PaymentButton from '@/components/dashboard/PaymentButton';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';

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

  const isApproved = ['approuve', 'en_attente_paiement'].includes(profile.statut_adhesion);
  const isPendingApproval = profile.statut_adhesion === 'en_attente_approbation';
  const isPendingPayment = profile.statut_adhesion === 'en_attente_paiement';
  const isRejected = profile.statut_adhesion === 'rejete';

  // Get user role
  const { data: roleProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single();

  const role = roleProfile?.role || 'membre';
  const isAdminUser = ['admin_ca', 'tresorier', 'superadmin'].includes(role);

  // Fetch events starting from today to today + 60 days
  const today = new Date();
  const sixtyDaysLater = new Date();
  sixtyDaysLater.setDate(today.getDate() + 60);

  const { data: upcomingEvents } = await supabase
    .from('evenements')
    .select('*')
    .eq('statut', 'publie')
    .gte('date_evenement', today.toISOString())
    .lte('date_evenement', sixtyDaysLater.toISOString())
    .order('date_evenement', { ascending: true });

  const filteredUpcoming = (upcomingEvents || []).filter(evt => {
    if (evt.audience === 'public' || evt.audience === 'membres') return true;
    if (evt.audience === 'administrateurs' && isAdminUser) return true;
    if (evt.audience === 'bureau' && isAdminUser) return true;
    return true;
  });

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

        {/* Right: Info & Upcoming Events */}
        <div className="space-y-6">
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

          {/* Upcoming Events Card */}
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Événements à venir (60 jours)</h2>
            <hr />
            {filteredUpcoming.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Aucun événement planifié dans les 60 prochains jours.</p>
            ) : (
              <div className="space-y-3 divide-y">
                {filteredUpcoming.slice(0, 4).map((evt, index) => {
                  const dateEvt = new Date(evt.date_evenement);
                  return (
                    <div key={evt.id} className={`pt-3 ${index === 0 ? 'pt-0' : ''} flex justify-between items-center text-xs`}>
                      <div>
                        <span className="font-bold text-slate-800 block">{evt.titre}</span>
                        <span className="text-slate-400 block text-[10px]">
                          Le {dateEvt.toLocaleDateString('fr-CA')} à {dateEvt.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <Link
                        href={`/evenements/${evt.id}`}
                        className="text-blue-900 hover:underline font-bold text-[10px] uppercase tracking-wider shrink-0"
                      >
                        Voir →
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
