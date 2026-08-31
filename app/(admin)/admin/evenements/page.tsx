'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Calendar,
  MapPin,
  Edit2,
  Trash2,
  Check,
  UserCheck,
  Plus,
  ArrowLeft,
  Search,
  Users,
  FileText,
  Upload,
  Sparkles,
  Globe,
  Video,
  ExternalLink,
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react';

interface Evenement {
  id: string;
  titre: string;
  description: string;
  date_evenement: string;
  lieu: string;
  capacite: number;
  est_payant: boolean;
  prix: number;
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

interface Inscription {
  id: string;
  statut_paiement: string;
  presence_validee: boolean;
  profiles: {
    prenom: string;
    nom: string;
    email: string;
  };
}

export default function AdminEventsPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<Evenement[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Evenement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [loading, setLoading] = useState(true);

  // Active View Mode: 'list' | 'form' | 'details'
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'details'>('list');

  // Selected Event & Relations
  const [selectedEvent, setSelectedEvent] = useState<Evenement | null>(null);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [dateEvenement, setDateEvenement] = useState('');
  const [lieu, setLieu] = useState('');
  const [capacite, setCapacite] = useState('');
  const [estPayant, setEstPayant] = useState(false);
  const [prix, setPrix] = useState('0.00');
  const [statut, setStatut] = useState('brouillon');
  const [typeEvt, setTypeEvt] = useState('autre');
  const [formatEvt, setFormatEvt] = useState('presentiel');
  const [dateFinEvenement, setDateFinEvenement] = useState('');
  const [lienReunion, setLienReunion] = useState('');
  const [audience, setAudience] = useState('public');
  const [requiertInscription, setRequiertInscription] = useState(true);
  const [visiblePublic, setVisiblePublic] = useState(true);
  const [commissionId, setCommissionId] = useState('');
  const [commissions, setCommissions] = useState<any[]>([]);

  // Document (CR/PV) Upload State
  const [docTitre, setDocTitre] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docDesc, setDocDesc] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    let result = events;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.titre.toLowerCase().includes(q) || e.lieu.toLowerCase().includes(q));
    }
    if (statusFilter !== 'tous') {
      result = result.filter(e => e.statut === statusFilter);
    }
    setFilteredEvents(result);
  }, [searchQuery, statusFilter, events]);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('evenements')
      .select('*')
      .order('date_evenement', { ascending: false });

    const { data: comms } = await supabase
      .from('commissions')
      .select('id, nom')
      .order('nom', { ascending: true });

    if (data && !error) {
      setEvents(data);
      setFilteredEvents(data);
    }
    if (comms) {
      setCommissions(comms);
    }
    setLoading(false);
  };

  const handleOpenCreateForm = () => {
    resetForm();
    setIsEditing(false);
    setSelectedEvent(null);
    setViewMode('form');
  };

  const handleOpenEditForm = (evt: Evenement) => {
    setSelectedEvent(evt);
    setTitre(evt.titre);
    setDescription(evt.description || '');
    const localDate = evt.date_evenement ? new Date(evt.date_evenement).toISOString().substring(0, 16) : '';
    setDateEvenement(localDate);
    setLieu(evt.lieu);
    setCapacite(evt.capacite?.toString() || '');
    setEstPayant(evt.est_payant);
    setPrix(evt.prix ? evt.prix.toString() : '0.00');
    setStatut(evt.statut);
    setTypeEvt(evt.type_evt);
    setFormatEvt(evt.format_evt);
    setDateFinEvenement(evt.date_fin_evenement ? new Date(evt.date_fin_evenement).toISOString().substring(0, 16) : '');
    setLienReunion(evt.lien_reunion || '');
    setAudience(evt.audience || 'public');
    setRequiertInscription(evt.requiert_inscription);
    setVisiblePublic(evt.visible_public);
    setCommissionId(evt.commission_id || '');
    setIsEditing(true);
    setViewMode('form');
  };

  const handleOpenDetails = (evt: Evenement) => {
    setSelectedEvent(evt);
    loadInscriptions(evt.id);
    setViewMode('details');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre || !dateEvenement || !lieu) {
      alert('Veuillez remplir les champs obligatoires (Titre, Date et Lieu).');
      return;
    }

    const payload = {
      titre,
      description,
      date_evenement: new Date(dateEvenement).toISOString(),
      lieu,
      capacite: capacite ? parseInt(capacite) : null,
      est_payant: estPayant,
      prix: estPayant ? parseFloat(prix) : 0,
      statut: selectedEvent?.statut === 'publie' ? 'publie' : 'brouillon',
      type_evt: typeEvt,
      format_evt: formatEvt,
      date_fin_evenement: dateFinEvenement ? new Date(dateFinEvenement).toISOString() : null,
      lien_reunion: lienReunion || null,
      audience,
      requiert_inscription: requiertInscription,
      visible_public: visiblePublic,
      commission_id: audience === 'commission' && commissionId ? commissionId : null,
    };

    if (isEditing && selectedEvent) {
      const { error } = await supabase
        .from('evenements')
        .update(payload)
        .eq('id', selectedEvent.id);

      if (!error) {
        alert('Événement mis à jour avec succès !');
        resetForm();
        setViewMode('list');
        fetchEvents();
      } else {
        alert('Erreur lors de la modification.');
      }
    } else {
      const { data: newEvt, error } = await supabase
        .from('evenements')
        .insert(payload)
        .select()
        .single();

      if (!error && newEvt) {
        alert('Événement créé avec succès !');
        resetForm();
        setViewMode('list');
        fetchEvents();
      } else {
        alert('Erreur lors de la création.');
      }
    }
  };

  const handleSaveAndSubmitValidation = async () => {
    if (!titre || !dateEvenement || !lieu) {
      alert('Veuillez remplir les champs obligatoires (Titre, Date et Lieu).');
      return;
    }

    const payload = {
      titre,
      description,
      date_evenement: new Date(dateEvenement).toISOString(),
      lieu,
      capacite: capacite ? parseInt(capacite) : null,
      est_payant: estPayant,
      prix: estPayant ? parseFloat(prix) : 0,
      statut: 'brouillon',
      type_evt: typeEvt,
      format_evt: formatEvt,
      date_fin_evenement: dateFinEvenement ? new Date(dateFinEvenement).toISOString() : null,
      lien_reunion: lienReunion || null,
      audience,
      requiert_inscription: requiertInscription,
      visible_public: visiblePublic,
      commission_id: audience === 'commission' && commissionId ? commissionId : null,
    };

    let targetId = selectedEvent?.id;
    if (isEditing && targetId) {
      await supabase.from('evenements').update(payload).eq('id', targetId);
    } else {
      const { data: newEvt } = await supabase.from('evenements').insert(payload).select().single();
      if (newEvt) targetId = newEvt.id;
    }

    if (targetId) {
      const { submitForValidation } = await import('@/app/actions/validation');
      await submitForValidation({
        typeEntite: 'evenement',
        entiteId: targetId,
        dateEffetProgrammee: dateEvenement,
      });
      alert('Événement transmis pour validation au circuit d\'approbation !');
      resetForm();
      setViewMode('list');
      fetchEvents();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cet événement ?')) {
      const { error } = await supabase
        .from('evenements')
        .delete()
        .eq('id', id);

      if (!error) {
        fetchEvents();
        if (selectedEvent?.id === id) {
          setSelectedEvent(null);
          setViewMode('list');
        }
      }
    }
  };

  const loadInscriptions = async (evtId: string) => {
    const { data, error } = await supabase
      .from('inscriptions_evenements')
      .select(`
        id,
        statut_paiement,
        presence_validee,
        profiles (
          prenom,
          nom,
          email
        )
      `)
      .eq('evenement_id', evtId);

    if (data && !error) {
      setInscriptions(data as any);
    }
  };

  const validatePresence = async (insId: string, currentStatus: boolean, evtId: string) => {
    const { error } = await supabase
      .from('inscriptions_evenements')
      .update({ presence_validee: !currentStatus })
      .eq('id', insId);

    if (!error) {
      loadInscriptions(evtId);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !docTitre || !docFile) return;

    setUploadingDoc(true);
    try {
      const fileExt = docFile.name.split('.').pop();
      const uniqueId = Math.random().toString(36).substring(2, 9);
      const storagePath = `${selectedEvent.id}/${uniqueId}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(storagePath, docFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadErr) throw uploadErr;

      let category = 'autre';
      if (selectedEvent.type_evt === 'ag' || selectedEvent.type_evt === 'age') {
        category = 'pv_ag';
      } else if (selectedEvent.type_evt === 'ca') {
        category = 'reglement';
      }

      const { error } = await supabase
        .from('documents')
        .insert({
          titre: docTitre,
          description: docDesc,
          file_url: storagePath,
          categorie: category,
          est_public: false,
          evenement_id: selectedEvent.id
        });

      if (!error) {
        alert("Procès-verbal / document téléversé et rattaché avec succès !");
        setDocTitre('');
        setDocDesc('');
        setDocFile(null);
      } else {
        throw error;
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors du téléversement du document.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setTitre('');
    setDescription('');
    setDateEvenement('');
    setLieu('');
    setCapacite('');
    setEstPayant(false);
    setPrix('0.00');
    setStatut('brouillon');
    setTypeEvt('autre');
    setFormatEvt('presentiel');
    setDateFinEvenement('');
    setLienReunion('');
    setAudience('public');
    setRequiertInscription(true);
    setVisiblePublic(true);
    setCommissionId('');
  };

  const getStatutBadge = (st: string) => {
    switch (st) {
      case 'publie':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold';
      case 'brouillon':
        return 'bg-slate-100 text-slate-700 border border-slate-200 font-bold';
      case 'termine':
        return 'bg-blue-100 text-blue-900 border border-blue-200 font-bold';
      case 'annule':
        return 'bg-red-100 text-red-800 border border-red-200 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 font-bold';
    }
  };

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

  // --- RENDER VUES ---

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* VUE 1 : LISTE DES ÉVÉNEMENTS (Défaut) */}
      {viewMode === 'list' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-blue-950">Gestion des Événements</h1>
              <p className="text-sm text-slate-500">Planifiez, publiez et gérez les Assemblées Générales, Réunions et Événements de Synergie UQO.</p>
            </div>
            <Button
              onClick={handleOpenCreateForm}
              className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold px-5 h-11 rounded-xl shadow-md transition-all shrink-0 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Ajouter un Événement
            </Button>
          </div>

          {/* Barre de Recherche et Filtres */}
          <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par titre, lieu..."
                  className="pl-9 h-10 border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-bold text-slate-500 shrink-0">Statut :</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 text-xs font-bold px-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-900 w-full md:w-44"
                >
                  <option value="tous">Tous les statuts</option>
                  <option value="publie">Publiés</option>
                  <option value="brouillon">Brouillons</option>
                  <option value="termine">Terminés</option>
                  <option value="annule">Annulés</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Grille des événements */}
          {loading ? (
            <p className="text-center py-16 text-slate-400 text-sm">Chargement du calendrier des événements...</p>
          ) : filteredEvents.length === 0 ? (
            <Card className="border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-3 bg-white">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-extrabold text-slate-800 text-base">Aucun événement trouvé</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'tous' ? 'Essayez de modifier vos filtres de recherche.' : 'Cliquez sur le bouton ci-dessus pour ajouter votre premier événement.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((evt) => (
                <Card key={evt.id} className="border border-slate-200/80 shadow-md rounded-3xl bg-white overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold bg-blue-50 text-blue-900 px-3 py-1 rounded-full border border-blue-150">
                        {getTypeLabel(evt.type_evt)}
                      </span>
                      <span className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full ${getStatutBadge(evt.statut)}`}>
                        {evt.statut}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-extrabold text-slate-900 text-lg leading-snug line-clamp-2">{evt.titre}</h3>
                      {evt.description && <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{evt.description}</p>}
                    </div>

                    <div className="space-y-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-900 shrink-0" />
                        <span className="font-semibold text-slate-800">
                          {new Date(evt.date_evenement).toLocaleDateString('fr-CA', { dateStyle: 'full' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="truncate">{evt.lieu}</span>
                      </div>
                      {evt.est_payant && (
                        <div className="text-amber-800 font-extrabold text-xs pt-1">
                          Tarif : {evt.prix.toFixed(2)} CAD
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDetails(evt)}
                      className="text-xs font-bold gap-1 rounded-xl h-9 text-blue-900 border-blue-200 hover:bg-blue-50"
                    >
                      <Users className="w-3.5 h-3.5" /> Inscrits & PV
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEditForm(evt)}
                        className="h-9 w-9 text-slate-700 hover:bg-slate-200 rounded-xl"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(evt.id)}
                        className="h-9 w-9 text-red-650 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VUE 2 : FORMULAIRE DE CRÉATION OU ÉDITION D'ÉVÉNEMENT */}
      {viewMode === 'form' && (
        <Card className="max-w-4xl mx-auto border border-slate-200/80 shadow-xl rounded-3xl bg-white overflow-hidden">
          <div className="h-1.5 bg-blue-900" />
          <form onSubmit={handleSave}>
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-6 bg-slate-50/50">
              <div>
                <CardTitle className="text-xl font-extrabold text-slate-900">
                  {isEditing ? `Modifier : ${selectedEvent?.titre}` : 'Créer un nouvel événement'}
                </CardTitle>
                <p className="text-xs text-slate-500">Complétez toutes les informations de l&apos;événement ci-dessous.</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setViewMode('list')}
                className="gap-2 font-bold text-slate-600 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" /> Retour à la liste
              </Button>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Colonne Gauche - Détails Généraux */}
                <div className="space-y-4">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 border-b pb-2">1. Informations Générales</h3>

                  <div className="space-y-1.5">
                    <Label htmlFor="titre" className="font-bold text-xs uppercase tracking-wider text-slate-700">Titre de l&apos;événement *</Label>
                    <Input
                      id="titre"
                      required
                      value={titre}
                      onChange={(e) => setTitre(e.target.value)}
                      placeholder="Ex: Assemblée Générale Annuelle 2026"
                      className="h-10 rounded-xl border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="typeEvt" className="font-bold text-xs uppercase tracking-wider text-slate-700">Type d&apos;Événement</Label>
                    <select
                      id="typeEvt"
                      value={typeEvt}
                      onChange={(e) => setTypeEvt(e.target.value)}
                      className="w-full h-10 p-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:ring-blue-900"
                    >
                      <option value="ag">Assemblée Générale (AG)</option>
                      <option value="age">Assemblée Générale Extraordinaire (AGE)</option>
                      <option value="ca">Conseil d&apos;Administration (CA)</option>
                      <option value="reunion_travail">Réunion de travail</option>
                      <option value="sortie">Sortie / Activité sociale</option>
                      <option value="assistance">Assistance / Entraide</option>
                      <option value="action_sociale">Action sociale</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="formatEvt" className="font-bold text-xs uppercase tracking-wider text-slate-700">Format</Label>
                    <select
                      id="formatEvt"
                      value={formatEvt}
                      onChange={(e) => setFormatEvt(e.target.value)}
                      className="w-full h-10 p-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:ring-blue-900"
                    >
                      <option value="presentiel">Présentiel</option>
                      <option value="en_ligne">En ligne (Virtuel)</option>
                      <option value="hybride">Hybride (Présentiel & En ligne)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lieu" className="font-bold text-xs uppercase tracking-wider text-slate-700">Lieu / Adresse *</Label>
                    <Input
                      id="lieu"
                      required
                      value={lieu}
                      onChange={(e) => setLieu(e.target.value)}
                      placeholder="Ex: Pavillon Lucien-Brault, Salle B-0120"
                      className="h-10 rounded-xl border-slate-200"
                    />
                  </div>

                  {(formatEvt === 'en_ligne' || formatEvt === 'hybride') && (
                    <div className="space-y-1.5">
                      <Label htmlFor="lienReunion" className="font-bold text-xs uppercase tracking-wider text-slate-700">Lien Visioconférence (Zoom, Teams...)</Label>
                      <Input
                        id="lienReunion"
                        value={lienReunion}
                        onChange={(e) => setLienReunion(e.target.value)}
                        placeholder="https://zoom.us/j/..."
                        className="h-10 rounded-xl border-slate-200"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="font-bold text-xs uppercase tracking-wider text-slate-700">Description détaillée</Label>
                    <Textarea
                      id="description"
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Détails de l'ordre du jour, informations pratiques..."
                      className="rounded-xl text-xs border-slate-200"
                    />
                  </div>
                </div>

                {/* Colonne Droite - Dates, Audience & Paramètres */}
                <div className="space-y-4">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 border-b pb-2">2. Dates, Inscriptions & Audience</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="date" className="font-bold text-xs uppercase tracking-wider text-slate-700">Début *</Label>
                      <Input
                        id="date"
                        type="datetime-local"
                        required
                        value={dateEvenement}
                        onChange={(e) => setDateEvenement(e.target.value)}
                        className="h-10 rounded-xl border-slate-200 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dateFin" className="font-bold text-xs uppercase tracking-wider text-slate-700">Fin (Optionnel)</Label>
                      <Input
                        id="dateFin"
                        type="datetime-local"
                        value={dateFinEvenement}
                        onChange={(e) => setDateFinEvenement(e.target.value)}
                        className="h-10 rounded-xl border-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="audience" className="font-bold text-xs uppercase tracking-wider text-slate-700">Audience autorisée</Label>
                    <select
                      id="audience"
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      className="w-full h-10 p-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:ring-blue-900"
                    >
                      <option value="public">Tout le monde (Public)</option>
                      <option value="membres">Membres approuvés uniquement</option>
                      <option value="administrateurs">Membres du CA uniquement</option>
                      <option value="bureau">Membres du Executive Bureau uniquement</option>
                      <option value="commission">Membres d&apos;une commission spécifique</option>
                    </select>
                  </div>

                  {audience === 'commission' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="commissionId" className="font-bold text-xs uppercase tracking-wider text-slate-700">Commission associée</Label>
                      <select
                        id="commissionId"
                        value={commissionId}
                        onChange={(e) => setCommissionId(e.target.value)}
                        className="w-full h-10 p-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:ring-blue-900"
                      >
                        <option value="">-- Choisir la commission --</option>
                        {commissions.map((c) => (
                          <option key={c.id} value={c.id}>{c.nom}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="capacite" className="font-bold text-xs uppercase tracking-wider text-slate-700">Capacité max. de places</Label>
                    <Input
                      id="capacite"
                      type="number"
                      value={capacite}
                      onChange={(e) => setCapacite(e.target.value)}
                      placeholder="Illimité si vide"
                      className="h-10 rounded-xl border-slate-200"
                    />
                  </div>

                  <div className="p-4 border rounded-2xl bg-slate-50/50 space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="visiblePublic"
                        checked={visiblePublic}
                        onCheckedChange={(checked) => setVisiblePublic(checked === true)}
                        className="w-5 h-5"
                      />
                      <Label htmlFor="visiblePublic" className="cursor-pointer font-bold text-xs text-slate-800">Afficher sur le site public</Label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="requiertInscription"
                        checked={requiertInscription}
                        onCheckedChange={(checked) => setRequiertInscription(checked === true)}
                        className="w-5 h-5"
                      />
                      <Label htmlFor="requiertInscription" className="cursor-pointer font-bold text-xs text-slate-800">Requiert inscription préalable</Label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="estPayant"
                        checked={estPayant}
                        onCheckedChange={(checked) => setEstPayant(checked === true)}
                        className="w-5 h-5"
                      />
                      <Label htmlFor="estPayant" className="cursor-pointer font-bold text-xs text-slate-800">Événement payant</Label>
                    </div>

                    {estPayant && (
                      <div className="space-y-1 pt-2">
                        <Label htmlFor="prix" className="font-bold text-xs text-slate-700">Prix par participant ($ CAD)</Label>
                        <Input
                          id="prix"
                          type="number"
                          step="0.01"
                          value={prix}
                          onChange={(e) => setPrix(e.target.value)}
                          className="h-9 rounded-xl bg-white border-slate-200"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-4 border rounded-2xl bg-amber-50/50 border-amber-200 text-xs text-amber-900 space-y-1">
                    <span className="font-extrabold block">📌 Circuit de Validation Requis :</span>
                    <p>Les événements sont créés et modifiés en mode <strong>brouillon</strong>. Utilisez le bouton <strong>« Soumettre pour Validation »</strong> pour transmettre votre fiche au circuit d'approbation (Présidence / CA).</p>
                  </div>
                </div>

              </div>
            </CardContent>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setViewMode('list')} className="font-bold rounded-xl">
                Annuler
              </Button>
              <Button type="button" onClick={handleSaveAndSubmitValidation} className="bg-amber-500 hover:bg-amber-600 text-blue-950 font-extrabold rounded-xl px-5 h-11 shadow-sm">
                Soumettre pour Validation
              </Button>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl px-6 h-11">
                {isEditing ? 'Enregistrer (Brouillon/Direct)' : 'Créer l\'événement'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* VUE 3 : GESTION DES INSCRIPTIONS ET DU PROCES-VERBAL */}
      {viewMode === 'details' && selectedEvent && (
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setViewMode('list')} className="gap-2 font-bold text-slate-600">
              <ArrowLeft className="w-4 h-4" /> Retour à la liste
            </Button>
            <Button variant="outline" onClick={() => handleOpenEditForm(selectedEvent)} className="gap-2 font-bold">
              <Edit2 className="w-4 h-4" /> Modifier cet événement
            </Button>
          </div>

          {/* En-tête de l'événement */}
          <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-blue-900 text-white p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                  {getTypeLabel(selectedEvent.type_evt)}
                </span>
                <h2 className="text-2xl font-extrabold">{selectedEvent.titre}</h2>
                <p className="text-xs text-blue-200">{selectedEvent.lieu} — {new Date(selectedEvent.date_evenement).toLocaleDateString('fr-CA', { dateStyle: 'full' })}</p>
              </div>
              <span className={`text-xs uppercase tracking-wider px-3 py-1 rounded-full text-slate-900 font-extrabold bg-amber-400 shrink-0`}>
                {selectedEvent.statut}
              </span>
            </div>
          </Card>

          {/* Tableau des inscrits */}
          <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-900" /> Liste des inscrits ({inscriptions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {inscriptions.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs italic">
                  Aucun membre inscrit pour cet événement.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow>
                      <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider py-4 pl-6">Participant</TableHead>
                      <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Courriel</TableHead>
                      <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Paiement</TableHead>
                      <TableHead className="font-extrabold text-xs text-slate-700 uppercase tracking-wider text-right pr-6">Présence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    {inscriptions.map((ins) => (
                      <TableRow key={ins.id}>
                        <TableCell className="font-extrabold text-slate-900 text-sm pl-6 py-4">
                          {ins.profiles.prenom} {ins.profiles.nom}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 font-medium">{ins.profiles.email}</TableCell>
                        <TableCell className="capitalize text-xs font-semibold">{ins.statut_paiement}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            size="sm"
                            variant={ins.presence_validee ? 'default' : 'outline'}
                            className={`font-bold rounded-xl text-xs h-9 ${
                              ins.presence_validee ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                            }`}
                            onClick={() => validatePresence(ins.id, ins.presence_validee, selectedEvent.id)}
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1" />
                            {ins.presence_validee ? 'Présence validée' : 'Valider présence'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Dépôt du Procès-Verbal ou Compte-rendu */}
          <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Documentation & Procès-Verbal (PV / Compte-rendu)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUploadDocument} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="docTitre" className="font-bold text-xs uppercase tracking-wider text-slate-700">Titre du Procès-Verbal / Document *</Label>
                    <Input id="docTitre" required value={docTitre} onChange={(e) => setDocTitre(e.target.value)} placeholder="Ex: PV officiel de l'AG de la rentrée" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="docDesc" className="font-bold text-xs uppercase tracking-wider text-slate-700">Description / Notes</Label>
                    <Input id="docDesc" value={docDesc} onChange={(e) => setDocDesc(e.target.value)} placeholder="Ex: Approuvé par le bureau le 30 août" className="h-10 rounded-xl" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="docFile" className="font-bold text-xs uppercase tracking-wider text-slate-700">Téléverser le fichier PDF/Word *</Label>
                  <Input
                    id="docFile"
                    type="file"
                    required
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    className="h-10 rounded-xl cursor-pointer"
                  />
                </div>

                <Button type="submit" disabled={uploadingDoc} className="bg-blue-900 hover:bg-blue-950 text-white font-bold h-11 rounded-xl px-6">
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingDoc ? 'Téléversement en cours...' : 'Publier et archiver le procès-verbal'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
