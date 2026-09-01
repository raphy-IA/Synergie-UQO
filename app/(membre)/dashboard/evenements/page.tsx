'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

interface Registration {
  id: string;
  statut_paiement: string;
  presence_validee: boolean;
  evenements: {
    id: string;
    titre: string;
    date_evenement: string;
    lieu: string;
  };
}

export default function MemberEventsDashboard() {
  const supabase = createClient();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRegistrations = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('inscriptions_evenements')
          .select(`
            id,
            statut_paiement,
            presence_validee,
            evenements (
              id,
              titre,
              date_evenement,
              lieu
            )
          `)
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false });

        if (data && !error) {
          setRegistrations(data as any);
        }
      }
      setLoading(false);
    };

    fetchRegistrations();
  }, [supabase]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-500 absolute top-0 left-0 right-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 text-blue-900 rounded-2xl">
                <Calendar className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Mes Événements & Inscriptions</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Retrouvez l&apos;historique et la confirmation de vos inscriptions aux activités et assemblées générales de Synergie UQO.
            </p>
          </div>
          <Link
            href="/evenements"
            className="inline-flex items-center justify-center bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-xs px-5 h-11 rounded-xl shadow-sm shrink-0"
          >
            Découvrir d&apos;autres événements →
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center text-slate-400 text-xs italic">
          Chargement de vos inscriptions en cours...
        </div>
      ) : registrations.length === 0 ? (
        <Card className="border border-dashed border-slate-200 rounded-3xl bg-white p-12">
          <CardContent className="py-6 text-center text-slate-500 space-y-4">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="font-extrabold text-slate-800 text-sm">Vous n&apos;êtes inscrit à aucun événement pour le moment.</p>
            <Link href="/evenements" className="inline-block bg-blue-900 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-sm hover:bg-blue-950">
              Explorer les événements du réseau →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {registrations.map((reg) => {
            const evt = reg.evenements;
            const dateObj = new Date(evt.date_evenement);
            return (
              <Card key={reg.id} className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden flex flex-col justify-between">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5 flex flex-row items-center justify-between">
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                    reg.statut_paiement === 'paye' || reg.statut_paiement === 'gratuit'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {reg.statut_paiement === 'paye' ? 'Payé' : reg.statut_paiement === 'gratuit' ? 'Gratuit' : 'En attente'}
                  </span>
                  {reg.presence_validee && (
                    <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5" /> Présence confirmée
                    </span>
                  )}
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <CardTitle className="text-lg font-extrabold text-slate-900">{evt.titre}</CardTitle>
                  <div className="space-y-2 text-xs text-slate-600 font-medium pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-900 shrink-0" />
                      <span>Le {dateObj.toLocaleDateString('fr-CA', { dateStyle: 'long' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-900 shrink-0" />
                      <span>À {dateObj.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-900 shrink-0" />
                      <span>{evt.lieu}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
