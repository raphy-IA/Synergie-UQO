'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar, MapPin, Clock } from 'lucide-react';

interface Evenement {
  id: string;
  titre: string;
  description: string;
  date_evenement: string;
  lieu: string;
  capacite: number;
  est_payant: boolean;
  prix: number;
  image_url: string;
  statut: string;
}

export default function EvenementsPublicPage() {
  const supabase = createClient();
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvenements = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('evenements')
        .select('*')
        .eq('statut', 'publie')
        .eq('visible_public', true)
        .order('date_evenement', { ascending: true });

      if (data && !error) {
        setEvenements(data);
      }
      setLoading(false);
    };

    fetchEvenements();
  }, [supabase]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-16 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-blue-950 tracking-tight">Nos Événements</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Participez à nos ateliers, conférences, activités de réseautage et assemblées générales.
        </p>
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-12">Chargement des événements...</p>
      ) : evenements.length === 0 ? (
        <div className="text-center text-slate-400 py-12 border border-dashed rounded-xl">
          Aucun événement à venir pour le moment. Revenez bientôt !
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {evenements.map((evt) => {
            const dateObj = new Date(evt.date_evenement);
            return (
              <Card key={evt.id} className="flex flex-col justify-between hover:shadow-md transition-shadow bg-white border border-slate-100 rounded-2xl overflow-hidden">
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      evt.est_payant ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {evt.est_payant ? `${evt.prix} $ CAD` : 'Gratuit'}
                    </span>
                    <CardTitle className="text-lg font-bold text-slate-900 line-clamp-2 pt-1">{evt.titre}</CardTitle>
                  </div>
                  <CardDescription className="line-clamp-3 text-slate-600 text-sm">{evt.description}</CardDescription>
                  
                  <div className="space-y-2 pt-2 border-t border-slate-50 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-900" />
                      <span>Le {dateObj.toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-900" />
                      <span>À {dateObj.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-900" />
                      <span className="line-clamp-1">{evt.lieu}</span>
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-0">
                  <Link href={`/evenements/${evt.id}`} className={`${buttonVariants({ variant: 'default' })} w-full bg-blue-900 hover:bg-blue-950 font-bold`}>
                    Détails & Inscription
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
