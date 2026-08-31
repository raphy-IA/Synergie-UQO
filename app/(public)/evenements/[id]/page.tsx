'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, Users, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

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
  type_evt: string;
  format_evt: string;
  date_fin_evenement?: string | null;
  lien_reunion?: string | null;
  audience: string;
  requiert_inscription: boolean;
  visible_public: boolean;
  commission_id?: string | null;
}

interface Document {
  id: string;
  titre: string;
  description: string;
  file_url: string;
  categorie: string;
}

export default function EvenementDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  const [event, setEvent] = useState<Evenement | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [eventDocuments, setEventDocuments] = useState<Document[]>([]);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);

      if (session?.user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', session.user.id)
          .single();
        if (prof) {
          setUserProfile(prof);
        }
      }

      // Get event details
      const { data: evt } = await supabase
        .from('evenements')
        .select('*')
        .eq('id', id)
        .single();

      if (evt) {
        setEvent(evt);

        // Fetch associated documents
        const { data: docs } = await supabase
          .from('documents')
          .select('*')
          .eq('evenement_id', id);

        if (docs) {
          setEventDocuments(docs);
        }

        // Check if user is already registered
        if (session?.user) {
          const { data: inscription } = await supabase
            .from('inscriptions_evenements')
            .select('*')
            .eq('evenement_id', id)
            .eq('profile_id', session.user.id)
            .single();

          if (inscription) {
            setRegistered(true);
          }
        }
      }
      setLoading(false);
    };

    fetchDetails();
  }, [id, supabase]);

  const handleRegister = async () => {
    if (!user) {
      router.push(`/login?redirectTo=/evenements/${id}`);
      return;
    }

    setRegistering(true);

    if (event?.est_payant) {
      // Pour les événements payants, on simulerait une session Stripe Checkout
      // Ici, on va appeler une action d'inscription simple ou simuler le paiement Stripe
      alert("Redirection vers la passerelle de paiement Stripe...");
      // Simulation de paiement réussi pour cet exemple :
      const { error } = await supabase
        .from('inscriptions_evenements')
        .insert({
          evenement_id: id,
          profile_id: user.id,
          statut_paiement: 'paye',
          presence_validee: false
        });

      if (!error) {
        setRegistered(true);
      }
    } else {
      // Gratuit
      const { error } = await supabase
        .from('inscriptions_evenements')
        .insert({
          evenement_id: id,
          profile_id: user.id,
          statut_paiement: 'gratuit',
          presence_validee: false
        });

      if (!error) {
        setRegistered(true);
      }
    }
    setRegistering(false);
  };

  const handleDownload = async (fileUrl: string) => {
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('/')) {
      window.open(fileUrl, '_blank');
      return;
    }

    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(fileUrl, 60);

    if (error) {
      console.error(error);
      alert("Erreur lors de la génération du lien de téléchargement.");
    } else if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  if (loading) return <p className="text-center py-16 text-slate-400">Chargement...</p>;
  if (!event) return <p className="text-center py-16 text-red-500">Événement introuvable.</p>;

  const dateObj = new Date(event.date_evenement);

  const formatLabels: { [key: string]: string } = {
    presentiel: 'Présentiel',
    en_ligne: 'En ligne',
    hybride: 'Hybride'
  };

  const typeLabels: { [key: string]: string } = {
    ag: 'Assemblée Générale (AG)',
    age: 'Assemblée Générale Extraordinaire (AGE)',
    ca: 'Conseil d\'Administration (CA)',
    reunion_travail: 'Réunion de travail',
    sortie: 'Sortie / Activité',
    assistance: 'Assistance / Entraide',
    action_sociale: 'Action sociale',
    autre: 'Événement'
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <Link href="/evenements" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-900 font-medium">
        <ArrowLeft className="w-4 h-4" /> Retour aux événements
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-wrap gap-2">
            <span className="bg-blue-100 text-blue-900 text-xs font-bold px-3 py-1 rounded-full">
              {typeLabels[event.type_evt] || 'Événement'}
            </span>
            <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-full">
              Format : {formatLabels[event.format_evt] || 'Présentiel'}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-blue-950">{event.titre}</h1>
          <p className="text-slate-750 whitespace-pre-line leading-relaxed">{event.description}</p>

          {/* Documents Section */}
          {eventDocuments.length > 0 && (
            <div className="border-t pt-8 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Documents officiels et Comptes-rendus</h3>
              <div className="grid grid-cols-1 gap-3">
                {eventDocuments.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 border rounded-xl">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{doc.titre}</h4>
                      <p className="text-xs text-slate-500">{doc.description || 'Compte-rendu d\'événement'}</p>
                    </div>
                    <button
                      onClick={() => handleDownload(doc.file_url)}
                      className="bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold px-3 py-2 rounded-lg"
                    >
                      Télécharger
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="border border-slate-100 shadow-md rounded-2xl bg-white sticky top-6">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  event.est_payant ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {event.est_payant ? `${event.prix} $ CAD` : 'Gratuit'}
                </span>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-blue-900 mt-0.5" />
                    <div>
                      <span className="font-bold block">Début :</span>
                      <span>Le {dateObj.toLocaleDateString('fr-CA', { dateStyle: 'medium' })} à {dateObj.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  {event.date_fin_evenement && (
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-blue-900 mt-0.5" />
                      <div>
                        <span className="font-bold block">Fin :</span>
                        <span>Le {new Date(event.date_fin_evenement).toLocaleDateString('fr-CA', { dateStyle: 'medium' })} à {new Date(event.date_fin_evenement).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-900" />
                    <span>{event.lieu}</span>
                  </div>
                  {event.capacite && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-900" />
                      <span>Capacité : {event.capacite} places</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic meeting link based on registration status */}
              {(event.format_evt === 'en_ligne' || event.format_evt === 'hybride') && (
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1.5">
                  <span className="text-xs font-bold text-blue-900 block">Réunion en ligne :</span>
                  {registered ? (
                    event.lien_reunion ? (
                      <a
                        href={event.lien_reunion}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-700 underline font-bold break-all block"
                      >
                        {event.lien_reunion}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">Lien non encore configuré.</span>
                    )
                  ) : (
                    <span className="text-xs text-slate-500 italic">Lien visible après inscription.</span>
                  )}
                </div>
              )}

              {!event.requiert_inscription ? (
                <div className="p-4 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl text-center">
                  <p className="text-xs font-bold">Cet événement ne requiert aucune inscription préalable (Entrée libre).</p>
                </div>
              ) : registered ? (
                <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl space-y-2 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-sm font-bold">Vous êtes inscrit !</p>
                  <Link href="/dashboard/evenements" className="text-xs text-blue-900 hover:underline block font-semibold">
                    Voir mes billets →
                  </Link>
                </div>
              ) : (
                (() => {
                  if (event.audience !== 'public' && !user) {
                    return (
                      <div className="space-y-3">
                        <p className="text-xs text-red-500 font-semibold text-center">
                          Cet événement est réservé aux membres de l&apos;association.
                        </p>
                        <Button onClick={handleRegister} className="w-full bg-blue-950 hover:bg-blue-900 text-white font-bold py-5 rounded-xl text-xs">
                          Se connecter pour s&apos;inscrire
                        </Button>
                      </div>
                    );
                  }

                  if (user && userProfile) {
                    const isAdminUser = ['admin_ca', 'tresorier', 'superadmin'].includes(userProfile.role);
                    
                    if (event.audience === 'administrateurs' && !isAdminUser) {
                      return (
                        <p className="text-xs text-red-500 font-semibold text-center p-3 bg-red-50 rounded-xl border border-red-100">
                          Inscription réservée aux administrateurs (CA).
                        </p>
                      );
                    }
                    if (event.audience === 'bureau' && !isAdminUser) {
                      return (
                        <p className="text-xs text-red-500 font-semibold text-center p-3 bg-red-50 rounded-xl border border-red-100">
                          Inscription réservée aux membres du bureau exécutif.
                        </p>
                      );
                    }
                  }

                  return (
                    <Button onClick={handleRegister} disabled={registering} className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold py-6 rounded-xl">
                      S&apos;inscrire à l&apos;événement
                    </Button>
                  );
                })()
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
