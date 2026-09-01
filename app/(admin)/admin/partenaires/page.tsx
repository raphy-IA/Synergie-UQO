'use client';

import React, { useEffect, useState } from 'react';
import ValidationDecisionModal from '@/components/admin/ValidationDecisionModal';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Globe, Edit2, Building2, ExternalLink, ArrowLeft, Search, Sparkles, Shield } from 'lucide-react';

interface Partner {
  id: string;
  nom: string;
  description: string;
  logo_url: string;
  site_web: string;
  niveau: string;
  actif: boolean;
}

export default function AdminPartenairesPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const paramId = searchParams.get('id');

  const [partenaires, setPartenaires] = useState<Partner[]>([]);
  const [filteredPartenaires, setFilteredPartenaires] = useState<Partner[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('tous');
  const [loading, setLoading] = useState(true);

  // View Mode: 'list' | 'form'
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  // Form State
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [siteWeb, setSiteWeb] = useState('');
  const [niveau, setNiveau] = useState('argent');
  const [actif, setActif] = useState(true);

  const [lockMap, setLockMap] = useState<Record<string, { statut: string }>>({});
  const [showDecisionModal, setShowDecisionModal] = useState(false);

  useEffect(() => {
    fetchPartenaires();
    fetchLockMap();
  }, []);

  useEffect(() => {
    if (paramId && partenaires.length > 0) {
      const target = partenaires.find(p => p.id === paramId);
      if (target) {
        setEditingPartner(target);
        setNom(target.nom);
        setDescription(target.description || '');
        setLogoUrl(target.logo_url);
        setSiteWeb(target.site_web || '');
        setNiveau(target.niveau);
        setActif(target.actif);
        setViewMode('form');
      }
    }
  }, [paramId, partenaires]);

  const fetchLockMap = async () => {
    const { getEntityLockStatuses } = await import('@/app/actions/validation');
    const data = await getEntityLockStatuses();
    setLockMap(data);
  };

  useEffect(() => {
    let result = partenaires;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.nom.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
    }
    if (levelFilter !== 'tous') {
      result = result.filter(p => p.niveau === levelFilter);
    }
    setFilteredPartenaires(result);
  }, [searchQuery, levelFilter, partenaires]);

  const fetchPartenaires = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('partenaires')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && !error) {
      setPartenaires(data);
      setFilteredPartenaires(data);
    }
    setLoading(false);
  };

  const handleOpenCreateForm = () => {
    resetForm();
    setEditingPartner(null);
    setViewMode('form');
  };

  const handleOpenEditForm = (partner: Partner) => {
    const valState = lockMap[`partenaire_${partner.id}`]?.statut;
    const isLocked = (valState && ['en_attente_n1', 'en_attente_n2', 'approuve'].includes(valState)) || partner.actif;
    if (isLocked) {
      alert("Ce partenaire a été soumis pour validation ou a été validé. Il ne peut plus être modifié sauf s'il est renvoyé pour révision.");
      return;
    }

    setEditingPartner(partner);
    setNom(partner.nom);
    setDescription(partner.description || '');
    setLogoUrl(partner.logo_url);
    setSiteWeb(partner.site_web || '');
    setNiveau(partner.niveau);
    setActif(partner.actif);
    setViewMode('form');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !logoUrl) {
      alert('Veuillez remplir le nom de l\'organisation et l\'URL du logo.');
      return;
    }

    const isActif = editingPartner ? editingPartner.actif : false;
    const payload = { nom, description, logo_url: logoUrl, site_web: siteWeb, niveau, actif: isActif };

    if (editingPartner) {
      const { error } = await supabase
        .from('partenaires')
        .update(payload)
        .eq('id', editingPartner.id);

      if (!error) {
        alert('Partenaire mis à jour avec succès !');
        resetForm();
        setViewMode('list');
        fetchPartenaires();
      } else {
        alert('Erreur lors de la modification du partenaire.');
      }
    } else {
      const { error } = await supabase
        .from('partenaires')
        .insert(payload);

      if (!error) {
        alert('Partenaire créé en mode inactif avec succès !');
        resetForm();
        setViewMode('list');
        fetchPartenaires();
      } else {
        alert('Erreur lors de la création du partenaire.');
      }
    }
  };

  const handleSaveAndSubmitValidation = async () => {
    if (!nom || !logoUrl) {
      alert('Veuillez remplir le nom de l\'organisation et l\'URL du logo.');
      return;
    }

    const payload = { nom, description, logo_url: logoUrl, site_web: siteWeb, niveau, actif: false };
    let partnerId = editingPartner?.id;

    if (editingPartner && partnerId) {
      await supabase.from('partenaires').update(payload).eq('id', partnerId);
    } else {
      const { data: newP } = await supabase.from('partenaires').insert(payload).select().single();
      if (newP) partnerId = newP.id;
    }

    if (partnerId) {
      const { submitForValidation } = await import('@/app/actions/validation');
      await submitForValidation({
        typeEntite: 'partenaire',
        entiteId: partnerId,
      });
      alert('Partenaire enregistré et transmis au circuit de validation !');
      resetForm();
      setViewMode('list');
      fetchPartenaires();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce partenaire ?')) {
      const { error } = await supabase
        .from('partenaires')
        .delete()
        .eq('id', id);

      if (!error) {
        fetchPartenaires();
      }
    }
  };

  const resetForm = () => {
    setEditingPartner(null);
    setNom('');
    setDescription('');
    setLogoUrl('');
    setSiteWeb('');
    setNiveau('argent');
    setActif(true);
  };

  const getNiveauBadge = (level: string) => {
    switch (level) {
      case 'platine':
        return 'bg-gradient-to-r from-slate-800 to-blue-900 text-white font-extrabold shadow-sm';
      case 'or':
        return 'bg-gradient-to-r from-amber-400 to-amber-500 text-blue-950 font-extrabold shadow-sm';
      default:
        return 'bg-slate-100 text-slate-700 font-bold border border-slate-200';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* VUE 1 : LISTE DES PARTENAIRES (Défaut) */}
      {viewMode === 'list' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-blue-950">Gestion des Partenaires</h1>
              <p className="text-sm text-slate-500">Ajoutez, modifiez et gérez les entreprises et organisations partenaires de Synergie UQO.</p>
            </div>
            <Button
              onClick={handleOpenCreateForm}
              className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold px-5 h-11 rounded-xl shadow-md transition-all shrink-0 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Ajouter un Partenaire
            </Button>
          </div>

          {/* Barre de recherche et filtres */}
          <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom d'organisation..."
                  className="pl-9 h-10 border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-bold text-slate-500 shrink-0">Niveau :</span>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="h-10 text-xs font-bold px-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-900 w-full md:w-44"
                >
                  <option value="tous">Tous les niveaux</option>
                  <option value="platine">Platine</option>
                  <option value="or">Or</option>
                  <option value="argent">Argent</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Grille des partenaires */}
          {loading ? (
            <p className="text-center py-16 text-slate-400 text-sm">Chargement des partenaires...</p>
          ) : filteredPartenaires.length === 0 ? (
            <Card className="border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-3 bg-white">
              <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-extrabold text-slate-800 text-base">Aucun partenaire trouvé</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery || levelFilter !== 'tous' ? 'Essayez de modifier vos filtres.' : 'Cliquez sur le bouton ci-dessus pour ajouter votre premier partenaire.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPartenaires.map((partner) => (
                <Card key={partner.id} className="border border-slate-200/80 shadow-md rounded-3xl bg-white overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {partner.logo_url ? (
                          <img
                            src={partner.logo_url}
                            alt={partner.nom}
                            className="w-12 h-12 rounded-xl object-contain border p-1 bg-slate-50 shrink-0"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-black text-base shrink-0">
                            {partner.nom[0]}
                          </div>
                        )}
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-lg leading-tight">{partner.nom}</h4>
                          <span className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block mt-1 ${getNiveauBadge(partner.niveau)}`}>
                            Partenaire {partner.niveau}
                          </span>
                        </div>
                      </div>
                      {!partner.actif && (
                        <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">
                          Inactif
                        </span>
                      )}
                    </div>

                    {partner.description && (
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed border-t pt-3 border-slate-100">
                        {partner.description}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    {partner.site_web ? (
                      <a href={partner.site_web} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-900 font-extrabold hover:underline">
                        <Globe className="w-3.5 h-3.5" /> Visiter le site <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    ) : <span className="text-xs text-slate-400 italic">Pas de site web</span>}

                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEditForm(partner)}
                        className="h-9 w-9 text-slate-700 hover:bg-slate-200 rounded-xl"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(partner.id)}
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

      {/* VUE 2 : FORMULAIRE DE CRÉATION DE PARTENAIRE */}
      {viewMode === 'form' && (() => {
        const valInfo = editingPartner?.id ? lockMap[`partenaire_${editingPartner.id}`] : null;
        const valState = valInfo?.statut;
        const isFormLocked = Boolean((valState && ['en_attente_n1', 'en_attente_n2', 'approuve'].includes(valState)) || editingPartner?.actif === true);

        return (
          <Card className="max-w-2xl mx-auto border border-slate-200/80 shadow-xl rounded-3xl bg-white overflow-hidden">
            <div className="h-1.5 bg-blue-900" />
            <form onSubmit={handleSave}>
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-6 bg-slate-50/50">
                <div>
                  <CardTitle className="text-xl font-extrabold text-slate-900">
                    {isFormLocked ? `Examen (Lecture seule) : ${editingPartner?.nom}` : editingPartner ? 'Modifier le partenaire' : 'Ajouter un nouveau partenaire'}
                  </CardTitle>
                  <p className="text-xs text-slate-500">Renseignez les détails et le logo de l&apos;organisation partenaire.</p>
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
              <CardContent className="p-8 space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="nom" className="font-bold text-xs uppercase tracking-wider text-slate-700">Nom de l&apos;organisation / entreprise *</Label>
                  <Input
                    id="nom"
                    required
                    disabled={isFormLocked}
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Ex: Desjardins, Hydro-Québec..."
                    className="h-11 rounded-xl border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="font-bold text-xs uppercase tracking-wider text-slate-700">Description</Label>
                  <Textarea
                    id="description"
                    disabled={isFormLocked}
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Présentation succinte du partenariat et des actions conjointes..."
                    className="rounded-xl text-xs border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="logoUrl" className="font-bold text-xs uppercase tracking-wider text-slate-700">URL du Logo *</Label>
                  <Input
                    id="logoUrl"
                    required
                    disabled={isFormLocked}
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://.../logo.png"
                    className="h-11 rounded-xl border-slate-200"
                  />
                  {logoUrl && (
                    <div className="pt-2 flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-medium">Aperçu :</span>
                      <img src={logoUrl} alt="Aperçu Logo" className="h-10 object-contain border p-1 rounded-lg bg-slate-50" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="siteWeb" className="font-bold text-xs uppercase tracking-wider text-slate-700">Site Web (Lien complet)</Label>
                  <Input
                    id="siteWeb"
                    disabled={isFormLocked}
                    value={siteWeb}
                    onChange={(e) => setSiteWeb(e.target.value)}
                    placeholder="https://example.com"
                    className="h-11 rounded-xl border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="niveau" className="font-bold text-xs uppercase tracking-wider text-slate-700">Niveau de Partenariat</Label>
                  <Select disabled={isFormLocked} value={niveau} onValueChange={(val) => setNiveau(val || 'argent')}>
                    <SelectTrigger className="w-full bg-white h-11 rounded-xl border-slate-200 text-xs font-bold">
                      <SelectValue placeholder="Choisir un niveau" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="platine">Platine</SelectItem>
                      <SelectItem value="or">Or</SelectItem>
                      <SelectItem value="argent">Argent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              {(() => {
                const valInfo = editingPartner?.id ? lockMap[`partenaire_${editingPartner.id}`] : null;
                const valState = valInfo?.statut;
                const isLocked = Boolean((valState && ['en_attente_n1', 'en_attente_n2', 'approuve'].includes(valState)) || editingPartner?.actif === true);

                if (isLocked) {
                  return (
                    <div className="p-4 border rounded-2xl bg-amber-100/80 border-amber-300 text-xs text-amber-950 space-y-1 font-semibold">
                      <span className="font-extrabold flex items-center gap-1.5 text-amber-900">
                        🔒 Mode Lecture Seule (Partenaire Soumis ou Validé)
                      </span>
                      <p>Ce partenaire a été soumis pour validation ou a été validé. Les modifications sont verrouillées sauf si des révisions sont demandées par le bureau.</p>
                    </div>
                  );
                }

                return (
                  <div className="p-4 border rounded-2xl bg-amber-50/50 border-amber-200 text-xs text-amber-900 space-y-1">
                    <span className="font-extrabold block">📌 Circuit de Validation Requis :</span>
                    <p>Les partenaires sont créés en mode <strong>inactif (brouillon)</strong>. Utilisez le bouton <strong>« Soumettre pour Validation »</strong> pour transmettre le dossier au circuit d'approbation (Trésorerie / Présidence).</p>
                  </div>
                );
              })()}
            </CardContent>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setViewMode('list')} className="font-bold rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-1" /> Retour / Annuler
              </Button>
              {(() => {
                const valInfo = editingPartner?.id ? lockMap[`partenaire_${editingPartner.id}`] : null;
                const valState = valInfo?.statut;
                const isLocked = Boolean((valState && ['en_attente_n1', 'en_attente_n2', 'approuve'].includes(valState)) || editingPartner?.actif === true);
                const isPendingValidation = valState === 'en_attente_n1' || valState === 'en_attente_n2';

                return (
                  <>
                    {isPendingValidation && (
                      <Button
                        type="button"
                        onClick={() => setShowDecisionModal(true)}
                        className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold px-6 h-11 rounded-xl shadow-md gap-2"
                      >
                        <Shield className="w-4 h-4 text-amber-400" /> Statuer sur la soumission
                      </Button>
                    )}
                    {!isLocked && (
                      <>
                        <Button type="button" onClick={handleSaveAndSubmitValidation} className="bg-amber-500 hover:bg-amber-600 text-blue-950 font-extrabold rounded-xl px-5 h-11 shadow-sm">
                          Soumettre pour Validation
                        </Button>
                        <Button type="submit" className="bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl px-6 h-11">
                          {editingPartner ? 'Enregistrer (Brouillon)' : 'Ajouter (Inactif)'}
                        </Button>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </form>

          {editingPartner?.id && (
            <ValidationDecisionModal
              isOpen={showDecisionModal}
              onClose={() => setShowDecisionModal(false)}
              typeEntite="partenaire"
              entiteId={editingPartner.id}
            />
          )}
        </Card>
      );
    })()}

    </div>
  );
}
