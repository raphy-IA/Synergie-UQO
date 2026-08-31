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
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-blue-950">Mes Événements</h1>

      {loading ? (
        <p className="text-slate-400">Chargement de vos inscriptions...</p>
      ) : registrations.length === 0 ? (
        <Card className="border border-dashed border-slate-200">
          <CardContent className="py-12 text-center text-slate-400 space-y-4">
            <p>Vous n&apos;êtes inscrit à aucun événement pour le moment.</p>
            <Link href="/evenements" className="inline-block text-blue-900 font-bold hover:underline">
              Découvrir les événements →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {registrations.map((reg) => {
            const evt = reg.evenements;
            const dateObj = new Date(evt.date_evenement);
            return (
              <Card key={reg.id} className="border border-slate-100 shadow-md rounded-2xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize ${
                    reg.statut_paiement === 'paye' || reg.statut_paiement === 'gratuit'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {reg.statut_paiement === 'paye' ? 'Payé' : reg.statut_paiement === 'gratuit' ? 'Gratuit' : 'En attente'}
                  </span>
                  {reg.presence_validee && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                      <CheckCircle className="w-3.5 h-3.5" /> Présence validée
                    </span>
                  )}
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <CardTitle className="text-lg font-bold text-slate-900">{evt.titre}</CardTitle>
                  <div className="space-y-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-900" />
                      <span>Le {dateObj.toLocaleDateString('fr-CA', { dateStyle: 'long' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-900" />
                      <span>À {dateObj.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-900" />
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
