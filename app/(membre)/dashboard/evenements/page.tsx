'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, CheckCircle, Clock, Users, FileText, CheckCircle2, Lock, ArrowRight, Video, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Evenement {
  id: string;
  titre: string;
  description: string;
  date_evenement: string;
  date_fin_evenement?: string | null;
  lieu: string;
  capacite: number;
  est_payant: boolean;
  prix: number;
  type_evt: string;
  format_evt: string;
  lien_reunion?: string | null;
  audience: string;
  requiert_inscription: boolean;
  commission_id?: string | null;
}

interface Inscription {
  id: string;
  evenement_id: string;
  statut_paiement: string;
  presence_validee: boolean;
  evenements: Evenement;
}

interface DocumentItem {
  id: string;
  titre: string;
  description: string;
  file_url: string;
  evenement_id: string;
}

export default function MemberEventsDashboard() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('membre');
  const [userCommissionIds, setUserCommissionIds] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<'a_venir' | 'mes_inscriptions' | 'passes'>('a_venir');
  const [allEvents, setAllEvents] = useState<Evenement[]>([]);
  const [myInscriptions, setMyInscriptions] = useState<Inscription[]>([]);
  const [eventDocuments, setEventDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [supabase]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      setCurrentUser(user);

      // 1. User Profile & Commissions
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = prof?.role || 'membre';
      setUserRole(role);
      const isAdminUser = ['admin_ca', 'tresorier', 'superadmin'].includes(role);

      const { data: comms } = await supabase
        .from('membres_commissions')
        .select('commission_id')
        .eq('profile_id', user.id);
      
      const commIds = (comms || []).map(c => c.commission_id);
      setUserCommissionIds(commIds);

      // 2. Fetch User's Inscriptions
      const { data: inscData } = await supabase
        .from('inscriptions_evenements')
        .select(`
          id,
          evenement_id,
          statut_paiement,
          presence_validee,
          evenements (*)
        `)
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });

      if (inscData) {
        setMyInscriptions(inscData as any);
      }

      // 3. Fetch Published Events
      const { data: eventsData } = await supabase
        .from('evenements')
        .select('*')
        .eq('statut', 'publie')
        .order('date_evenement', { ascending: true });

      // Filter events concerning the user
      const filtered = (eventsData || []).filter(evt => {
        if (evt.audience === 'public' || evt.audience === 'membres') return true;
        if (evt.audience === 'commission' && evt.commission_id && commIds.includes(evt.commission_id)) return true;
        if ((evt.audience === 'administrateurs' || evt.audience === 'bureau') && isAdminUser) return true;
        return false;
      });

      setAllEvents(filtered);

      // 4. Fetch Associated PV / Documents
      const { data: docs } = await supabase
        .from('documents')
        .select('id, titre, description, file_url, evenement_id')
        .not('evenement_id', 'is', null);

      if (docs) {
        setEventDocuments(docs as any);
      }
    }
    setLoading(false);
  };

  const isUserRegistered = (evtId: string) => {
    return myInscriptions.some(i => i.evenement_id === evtId);
  };

  const handleRegister = async (evt: Evenement) => {
    if (!currentUser) return;
    setActionLoadingId(evt.id);

    if (evt.est_payant) {
      alert(`Événement payant (${evt.prix} CAD). Redirection vers le système de paiement...`);
      const { error } = await supabase
        .from('inscriptions_evenements')
        .insert({
          evenement_id: evt.id,
          profile_id: currentUser.id,
          statut_paiement: 'paye',
          presence_validee: false
        });

      if (!error) {
        alert("Inscription enregistrée !");
        await fetchData();
      }
    } else {
      const { error } = await supabase
        .from('inscriptions_evenements')
        .insert({
          evenement_id: evt.id,
          profile_id: currentUser.id,
          statut_paiement: 'gratuit',
          presence_validee: false
        });

      if (!error) {
        await fetchData();
      } else {
        alert("Erreur lors de l'inscription.");
      }
    }
    setActionLoadingId(null);
  };

  const handleDownloadDoc = async (fileUrl: string) => {
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('/')) {
      window.open(fileUrl, '_blank');
      return;
    }

    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(fileUrl, 60);

    if (error) {
      console.error(error);
      alert("Erreur lors du téléchargement du document.");
    } else if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const now = new Date();

  const upcomingEvents = allEvents.filter(evt => {
    const targetEnd = evt.date_fin_evenement || evt.date_evenement;
    return new Date(targetEnd) >= now;
  });

  const pastEvents = allEvents.filter(evt => {
    const targetEnd = evt.date_fin_evenement || evt.date_evenement;
    return new Date(targetEnd) < now;
  });

  const getTypeLabel = (t: string) => {
    switch (t) {
      case 'ag': return 'Assemblée Générale';
      case 'age': return 'AG Extraordinaire';
      case 'ca': return 'Conseil d\'Administration';
      case 'reunion_travail': return 'Réunion de travail';
      case 'sortie': return 'Activité sociale';
      case 'assistance': return 'Assistance';
      case 'action_sociale': return 'Action sociale';
      default: return 'Événement';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-500 absolute top-0 left-0 right-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 text-blue-950 rounded-2xl">
                <Calendar className="w-6 h-6 text-blue-950" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Espace Événements & Activités</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Consultez les événements qui vous concernent, inscrivez-vous en 1 clic et accédez aux Procès-Verbaux (PV).
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 p-1.5 bg-slate-100/90 rounded-2xl text-xs font-extrabold border border-slate-200/60 self-start sm:self-center shrink-0">
            <button
              onClick={() => setActiveTab('a_venir')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeTab === 'a_venir' ? 'bg-blue-950 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              À venir ({upcomingEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('mes_inscriptions')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeTab === 'mes_inscriptions' ? 'bg-blue-950 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mes Inscriptions ({myInscriptions.length})
            </button>
            <button
              onClick={() => setActiveTab('passes')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeTab === 'passes' ? 'bg-blue-950 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Passés & PV ({pastEvents.length})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center text-slate-400 text-xs italic">
          Chargement de vos événements...
        </div>
      ) : activeTab === 'a_venir' ? (
        /* TAB 1 : EVENEMENTS A VENIR (CATALOGUE INTÉGRÉ) */
        upcomingEvents.length === 0 ? (
          <Card className="border border-dashed border-slate-200 rounded-3xl bg-white p-12 text-center space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-slate-800 text-sm">Aucun événement à venir pour le moment</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Revenez régulièrement pour découvrir les prochaines activités de Synergie UQO.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((evt) => {
              const registered = isUserRegistered(evt.id);
              const dateObj = new Date(evt.date_evenement);

              return (
                <Card key={evt.id} className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-extrabold tracking-wider bg-blue-50 text-blue-950 px-3 py-1 rounded-full border border-blue-200">
                        {getTypeLabel(evt.type_evt)}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        evt.est_payant ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}>
                        {evt.est_payant ? `${evt.prix.toFixed(2)} $ CAD` : 'Gratuit'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-extrabold text-slate-900 text-lg leading-snug line-clamp-2">{evt.titre}</h3>
                      {evt.description && <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{evt.description}</p>}
                    </div>

                    <div className="space-y-2 text-xs text-slate-500 pt-2 border-t border-slate-100 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-950 shrink-0" />
                        <span>Le {dateObj.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-950 shrink-0" />
                        <span>À {dateObj.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="truncate">{evt.lieu}</span>
                      </div>
                    </div>

                    {/* Visioconférence link for registered members */}
                    {(evt.format_evt === 'en_ligne' || evt.format_evt === 'hybride') && registered && evt.lien_reunion && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs space-y-1">
                        <span className="font-extrabold text-blue-950 flex items-center gap-1">
                          <Video className="w-3.5 h-3.5 text-blue-950" /> Lien Visioconférence :
                        </span>
                        <a href={evt.lien_reunion} target="_blank" rel="noopener noreferrer" className="text-blue-900 font-bold underline truncate block">
                          {evt.lien_reunion}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50/80 border-t border-slate-100">
                    {!evt.requiert_inscription ? (
                      <div className="text-center p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 font-extrabold text-xs">
                        Entrée libre (Sans inscription)
                      </div>
                    ) : registered ? (
                      <div className="flex items-center justify-between gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-extrabold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Inscription confirmée
                        </span>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleRegister(evt)}
                        disabled={actionLoadingId === evt.id}
                        className="w-full bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-xs h-10 rounded-xl shadow-sm"
                      >
                        {actionLoadingId === evt.id ? "Inscription..." : "S'inscrire à l'événement"}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : activeTab === 'mes_inscriptions' ? (
        /* TAB 2 : MES INSCRIPTIONS */
        myInscriptions.length === 0 ? (
          <Card className="border border-dashed border-slate-200 rounded-3xl bg-white p-12 text-center space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-slate-800 text-sm">Vous n&apos;êtes inscrit à aucun événement</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Basculez sur l&apos;onglet « À venir » pour parcourir les activités et réserver votre place.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myInscriptions.map((reg) => {
              const evt = reg.evenements;
              const dateObj = new Date(evt.date_evenement);
              return (
                <Card key={reg.id} className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden flex flex-col justify-between">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5 flex flex-row items-center justify-between">
                    <span className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                      reg.statut_paiement === 'paye' || reg.statut_paiement === 'gratuit'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                    }`}>
                      {reg.statut_paiement === 'paye' ? 'Payé' : reg.statut_paiement === 'gratuit' ? 'Gratuit' : 'En attente'}
                    </span>
                    {reg.presence_validee && (
                      <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5" /> Présence confirmée
                      </span>
                    )}
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <CardTitle className="text-lg font-extrabold text-slate-900">{evt.titre}</CardTitle>
                    <div className="space-y-2 text-xs text-slate-600 font-medium pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-950 shrink-0" />
                        <span>Le {dateObj.toLocaleDateString('fr-CA', { dateStyle: 'long' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-950 shrink-0" />
                        <span>À {dateObj.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{evt.lieu}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        /* TAB 3 : EVENEMENTS PASSES & PV / DOCUMENTS */
        pastEvents.length === 0 ? (
          <Card className="border border-dashed border-slate-200 rounded-3xl bg-white p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-slate-800 text-sm">Aucun événement passé répertorié</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Les comptes-rendus et procès-verbaux (PV) d&apos;Assemblées Générales apparaîtront ici après la tenue des événements.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {pastEvents.map((evt) => {
              const docs = eventDocuments.filter(d => d.evenement_id === evt.id);
              const dateObj = new Date(evt.date_evenement);

              return (
                <Card key={evt.id} className="border border-slate-200/80 shadow-md rounded-3xl bg-white overflow-hidden p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold tracking-wider bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200 inline-block mb-1">
                        {getTypeLabel(evt.type_evt)} — Événement Passé
                      </span>
                      <h3 className="text-xl font-extrabold text-slate-900">{evt.titre}</h3>
                    </div>
                    <span className="text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                      Tenu le {dateObj.toLocaleDateString('fr-CA', { dateStyle: 'long' })}
                    </span>
                  </div>

                  {/* Documents & PV for this past event */}
                  <div className="space-y-3 pt-1">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-500" /> Documents officiels & Procès-verbaux
                    </h4>

                    {docs.length === 0 ? (
                      <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                        Aucun procès-verbal ou document publié pour cet événement pour le moment.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {docs.map((doc) => (
                          <div key={doc.id} className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <h5 className="font-extrabold text-xs text-slate-900 truncate">{doc.titre}</h5>
                              <p className="text-[11px] text-slate-500 truncate">{doc.description || 'Document officiel'}</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleDownloadDoc(doc.file_url)}
                              className="bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-xs rounded-xl shrink-0 h-9"
                            >
                              Télécharger
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
