'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, Download, FolderOpen, Lock, ShieldCheck, Plus, Search, 
  FolderPlus, Users, Calendar, Globe, Settings, Folder, Trash2, Edit3, Filter, Shield
} from 'lucide-react';
import { createDocumentFolder, updateDocumentFolder, deleteDocumentFolder, saveDocument, updateDocumentVisibilityAndFolder, deleteDocument } from '@/app/actions/documents';

interface DocumentFolder {
  id: string;
  nom: string;
  description: string | null;
  slug: string;
  icone: string;
  couleur: string;
  est_systeme: boolean;
  visibilite_defaut: string;
}

interface DocumentItem {
  id: string;
  titre: string;
  description: string | null;
  file_url: string;
  categorie: string;
  visibilite: 'public' | 'membres' | 'participants' | 'commission' | 'bureau_ca';
  est_public: boolean;
  folder_id: string | null;
  created_at: string;
  commission_id?: string | null;
  evenement_id?: string | null;
  reunion_id?: string | null;
  tache_id?: string | null;
  extension?: string | null;
  commissions?: { nom: string } | null;
  evenements?: { titre: string } | null;
  reunions?: { titre: string } | null;
}

export default function AdminDocumentsClient() {
  const supabase = createClient();
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation & Search
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  
  // Modals state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showRightsModal, setShowRightsModal] = useState(false);
  const [selectedDocForRights, setSelectedDocForRights] = useState<DocumentItem | null>(null);

  // New Folder Form State
  const [folderNom, setFolderNom] = useState('');
  const [folderDesc, setFolderDesc] = useState('');
  const [folderVisibilite, setFolderVisibilite] = useState<string>('membres');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // New Document Form State
  const [docTitre, setDocTitre] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docFolderId, setDocFolderId] = useState<string>('root');
  const [docVisibilite, setDocVisibilite] = useState<string>('membres');
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const fetchLibraryData = async () => {
    setLoading(true);

    // 1. Fetch Folders
    const { data: foldersData } = await supabase
      .from('document_folders')
      .select('*')
      .order('ordre', { ascending: true })
      .order('nom', { ascending: true });

    setFolders(foldersData || []);

    // 2. Fetch All Documents for Admin
    const { data: docsData } = await supabase
      .from('documents')
      .select(`
        *,
        commissions:commission_id (nom),
        evenements:evenement_id (titre),
        reunions:reunion_id (titre)
      `)
      .order('created_at', { ascending: false });

    if (docsData) {
      setDocuments(docsData as any);
    }
    setLoading(false);
  };

  const handleDownload = async (fileUrl: string) => {
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('/')) {
      window.open(fileUrl, '_blank');
      return;
    }

    const { data, error } = await supabase.storage.from('documents').createSignedUrl(fileUrl, 60);

    if (error) {
      console.error(error);
      alert("Erreur lors de la génération du lien de téléchargement.");
    } else if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const handleCreateFolder = async () => {
    if (!folderNom) return;
    setIsCreatingFolder(true);
    try {
      const res = await createDocumentFolder({
        nom: folderNom,
        description: folderDesc,
        parent_id: selectedFolderId,
        visibilite_defaut: folderVisibilite,
      });
      if (res?.error) {
        alert(res.error);
      } else {
        setFolderNom('');
        setFolderDesc('');
        setShowFolderModal(false);
        fetchLibraryData();
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la création du dossier");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce dossier ?")) return;
    try {
      const res = await deleteDocumentFolder(folderId);
      if (res?.error) {
        alert(res.error);
      } else {
        if (selectedFolderId === folderId) setSelectedFolderId(null);
        fetchLibraryData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateDocument = async () => {
    if (!docTitre || !docUrl) return;
    setIsSavingDoc(true);
    try {
      const res = await saveDocument({
        titre: docTitre,
        description: docDesc,
        file_url: docUrl,
        folder_id: docFolderId === 'root' ? selectedFolderId : docFolderId,
        visibilite: docVisibilite,
      });
      if (res?.error) {
        alert(res.error);
      } else {
        setDocTitre('');
        setDocDesc('');
        setDocUrl('');
        setShowDocModal(false);
        fetchLibraryData();
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'enregistrement du document");
    } finally {
      setIsSavingDoc(false);
    }
  };

  const handleUpdateVisibility = async (newVis: string) => {
    if (!selectedDocForRights) return;
    try {
      const res = await updateDocumentVisibilityAndFolder(selectedDocForRights.id, {
        visibilite: newVis
      });
      if (res?.error) {
        alert(res.error);
      } else {
        setShowRightsModal(false);
        fetchLibraryData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce document ?")) return;
    try {
      const res = await deleteDocument(docId);
      if (res?.error) {
        alert(res.error);
      } else {
        fetchLibraryData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getVisibilityBadge = (vis: string) => {
    switch (vis) {
      case 'public':
        return <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold gap-1"><Globe className="w-3 h-3" /> Public</Badge>;
      case 'membres':
        return <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold gap-1"><Users className="w-3 h-3" /> Membres connectés</Badge>;
      case 'participants':
        return <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold gap-1"><Calendar className="w-3 h-3" /> Participants</Badge>;
      case 'commission':
        return <Badge className="bg-indigo-50 text-indigo-800 border-indigo-200 text-[10px] font-bold gap-1"><Users className="w-3 h-3" /> Commission</Badge>;
      case 'bureau_ca':
        return <Badge className="bg-rose-50 text-rose-800 border-rose-200 text-[10px] font-bold gap-1"><Lock className="w-3 h-3" /> Bureau & CA</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{vis}</Badge>;
    }
  };

  const currentFolder = folders.find(f => f.id === selectedFolderId);
  const displayedDocs = documents.filter(doc => {
    if (selectedFolderId && doc.folder_id !== selectedFolderId) return false;
    if (visibilityFilter !== 'all' && doc.visibilite !== visibilityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitre = doc.titre.toLowerCase().includes(q);
      const matchDesc = doc.description?.toLowerCase().includes(q);
      return matchTitre || matchDesc;
    }
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ─── BANNIÈRE D'EN-TÊTE ET ACTIONS ADMINISTRATEUR ─── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-950 via-amber-500 to-indigo-900 absolute top-0 left-0 right-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-900 rounded-2xl border border-amber-200 shadow-xs">
              <Shield className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                Administration des Documents & Droits
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Gérez l&apos;arborescence des dossiers, déposez des pièces officielles et configurez la visibilité.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              onClick={() => setShowFolderModal(true)}
              variant="outline"
              className="bg-white hover:bg-slate-50 border-slate-200 text-slate-800 text-xs font-bold gap-2 rounded-xl h-10 shadow-xs"
            >
              <FolderPlus className="w-4 h-4 text-amber-500" /> Nouveau Dossier
            </Button>
            <Button
              onClick={() => setShowDocModal(true)}
              className="bg-blue-950 hover:bg-blue-900 text-white text-xs font-bold gap-2 rounded-xl h-10 shadow-md"
            >
              <Plus className="w-4 h-4 text-amber-400" /> Ajouter un Document
            </Button>
          </div>
        </div>
      </div>

      {/* ─── BARRE DE RECHERCHE ET FILTRES ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Rechercher par titre ou résumé..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-xs bg-slate-50 border-slate-200 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <Select value={visibilityFilter} onValueChange={(val) => setVisibilityFilter(val || 'all')}>
            <SelectTrigger className="h-10 text-xs bg-slate-50 border-slate-200 rounded-xl w-full sm:w-60 font-medium">
              <SelectValue placeholder="Tous les niveaux d'accès" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les niveaux d&apos;accès</SelectItem>
              <SelectItem value="public">🌐 Public (Accessible à tous)</SelectItem>
              <SelectItem value="membres">👥 Membres authentifiés</SelectItem>
              <SelectItem value="participants">📅 Participants aux réunions</SelectItem>
              <SelectItem value="commission">🤝 Commissions dédiées</SelectItem>
              <SelectItem value="bureau_ca">🔒 Restreint Bureau & CA</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── GRILLE DES DOSSIERS DE CLASSEMENT AVEC ACTIONS ADMIN ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-500" /> Structure des Dossiers Administratifs
          </h2>
          {selectedFolderId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFolderId(null)}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900"
            >
              ← Racine générale
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div
            onClick={() => setSelectedFolderId(null)}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-28 ${
              selectedFolderId === null 
                ? 'bg-blue-950 text-white border-blue-900 shadow-md' 
                : 'bg-white text-slate-800 border-slate-200/80 hover:border-blue-200 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <FolderOpen className={`w-6 h-6 ${selectedFolderId === null ? 'text-amber-400' : 'text-blue-950'}`} />
              <Badge variant="outline" className={`text-[10px] font-bold ${selectedFolderId === null ? 'border-white/20 text-slate-200' : ''}`}>
                {documents.length} docs
              </Badge>
            </div>
            <div>
              <p className="font-extrabold text-xs">Tous les documents</p>
              <p className={`text-[10px] truncate ${selectedFolderId === null ? 'text-slate-300' : 'text-slate-400'}`}>
                Catalogue global admin
              </p>
            </div>
          </div>

          {folders.map(f => {
            const isSelected = selectedFolderId === f.id;
            const count = documents.filter(d => d.folder_id === f.id).length;
            return (
              <div
                key={f.id}
                onClick={() => setSelectedFolderId(f.id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-28 relative group ${
                  isSelected 
                    ? 'bg-blue-950 text-white border-blue-900 shadow-md' 
                    : 'bg-white text-slate-800 border-slate-200/80 hover:border-blue-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Folder className={`w-6 h-6 ${isSelected ? 'text-amber-400' : 'text-amber-500'}`} />
                  <div className="flex items-center gap-1">
                    {!f.est_systeme && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(f.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-slate-400 transition-opacity"
                        title="Supprimer ce dossier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <Badge variant="outline" className={`text-[10px] font-bold ${isSelected ? 'border-white/20 text-slate-200' : ''}`}>
                      {count} docs
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="font-extrabold text-xs truncate flex items-center gap-1">
                    {f.nom} {f.est_systeme && <span className="text-[9px] font-normal text-amber-500">(Système)</span>}
                  </p>
                  <p className={`text-[10px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                    {f.description || 'Dossier de classement'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── TABLEAU DES DOCUMENTS & GESTION DES DROITS ─── */}
      <Card className="border-0 shadow-md rounded-3xl bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 px-6 py-5 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-950" />
              <div>
                <CardTitle className="text-base font-bold text-slate-950">
                  {currentFolder ? currentFolder.nom : 'Tous les documents enregistrés'}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {displayedDocs.length} document(s) répertorié(s).
                </CardDescription>
              </div>
            </div>

            {currentFolder && (
              <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-200 text-xs font-bold">
                Dossier sélectionné
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {loading ? (
            <div className="text-center text-slate-400 py-12 text-xs italic">
              Chargement des dossiers d&apos;administration...
            </div>
          ) : displayedDocs.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
              <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">Aucun document dans ce dossier.</p>
              <Button onClick={() => setShowDocModal(true)} className="text-xs bg-blue-950 text-white font-bold h-8 rounded-lg">
                <Plus className="w-3.5 h-3.5 mr-1" /> Publier un document
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedDocs.map((doc) => (
                <div 
                  key={doc.id}
                  className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-950 flex items-center justify-center shrink-0 border border-blue-100">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-950 group-hover:text-blue-900 transition-colors leading-tight">
                            {doc.titre}
                          </h4>
                          <span className="text-[10px] text-slate-400 block pt-0.5">
                            Mis en ligne le {new Date(doc.created_at).toLocaleDateString('fr-CA', { dateStyle: 'medium' })}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedDocForRights(doc);
                          setShowRightsModal(true);
                        }}
                        className="h-8 text-[11px] font-bold text-slate-600 hover:text-blue-900 hover:bg-blue-50 px-2 rounded-lg gap-1 border border-slate-200"
                      >
                        <Settings className="w-3.5 h-3.5 text-amber-600" /> Droits
                      </Button>
                    </div>

                    {doc.description && (
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                        {doc.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {getVisibilityBadge(doc.visibilite)}

                      {doc.commissions && (
                        <span className="text-[10px] bg-blue-50 text-blue-900 font-bold px-2 py-0.5 rounded-md border border-blue-100">
                          Commission : {doc.commissions.nom}
                        </span>
                      )}
                      {doc.evenements && (
                        <span className="text-[10px] bg-amber-50 text-amber-900 font-bold px-2 py-0.5 rounded-md border border-amber-100">
                          Événement : {doc.evenements.titre}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-mono text-slate-400">
                      {doc.extension ? `Format .${doc.extension.toUpperCase()}` : 'Fichier téléchargeable'}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="h-8 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 px-2 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        onClick={() => handleDownload(doc.file_url)}
                        className="h-8 bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs rounded-xl gap-1.5 px-3 shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" /> Télécharger
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── MODAL 1: CRÉER UN NOUVEAU DOSSIER ─── */}
      <Dialog open={showFolderModal} onOpenChange={setShowFolderModal}>
        <DialogContent className="rounded-3xl p-6 bg-white max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-amber-500" /> Créer un dossier personnalisable
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Structurez l&apos;arborescence des documents avec un niveau d&apos;accès par défaut.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-bold">Nom du dossier *</Label>
              <Input
                placeholder="Ex: Comptes-rendus Commission Réseau 2026"
                value={folderNom}
                onChange={(e) => setFolderNom(e.target.value)}
                className="h-9 bg-slate-50 border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-700 font-bold">Description / Objet</Label>
              <Input
                placeholder="Ex: Documents internes d'archivage..."
                value={folderDesc}
                onChange={(e) => setFolderDesc(e.target.value)}
                className="h-9 bg-slate-50 border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-700 font-bold">Droits d&apos;accès par défaut</Label>
              <Select value={folderVisibilite} onValueChange={(val) => setFolderVisibilite(val || 'membres')}>
                <SelectTrigger className="h-9 bg-slate-50 border-slate-200 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">🌐 Public (Accessible à tous)</SelectItem>
                  <SelectItem value="membres">👥 Membres authentifiés</SelectItem>
                  <SelectItem value="participants">📅 Participants aux réunions</SelectItem>
                  <SelectItem value="commission">🤝 Membres de commissions</SelectItem>
                  <SelectItem value="bureau_ca">🔒 Restreint Bureau & CA</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowFolderModal(false)} className="h-8 text-xs rounded-lg">
              Annuler
            </Button>
            <Button 
              onClick={handleCreateFolder} 
              disabled={isCreatingFolder || !folderNom}
              className="h-8 bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs rounded-lg"
            >
              {isCreatingFolder ? 'Création...' : 'Créer le dossier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: AJOUTER UN DOCUMENT AVEC ACCÈS CONFIGURABLE ─── */}
      <Dialog open={showDocModal} onOpenChange={setShowDocModal}>
        <DialogContent className="rounded-3xl p-6 bg-white max-w-lg shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-900" /> Publier un document officiel
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Importez un fichier et définissez ses droits d&apos;accès spécifiques.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-bold">Titre du document *</Label>
              <Input
                placeholder="Ex: Procès-verbal AG Ordinaire 2026"
                value={docTitre}
                onChange={(e) => setDocTitre(e.target.value)}
                className="h-9 bg-slate-50 border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-700 font-bold">Lien URL ou chemin du fichier *</Label>
              <Input
                placeholder="Ex: https://... ou /documents/pv_ag_2026.pdf"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                className="h-9 bg-slate-50 border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-700 font-bold">Description synthétique</Label>
              <Input
                placeholder="Résumé des résolutions adoptées..."
                value={docDesc}
                onChange={(e) => setDocDesc(e.target.value)}
                className="h-9 bg-slate-50 border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold">Dossier de classement</Label>
                <Select value={docFolderId} onValueChange={(val) => setDocFolderId(val || 'root')}>
                  <SelectTrigger className="h-9 bg-slate-50 border-slate-200 rounded-lg text-xs">
                    <SelectValue placeholder="Racine générale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">📁 Aucun dossier (Racine)</SelectItem>
                    {folders.map(f => (
                      <SelectItem key={f.id} value={f.id}>📁 {f.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold">Droits d&apos;accès / Visibilité</Label>
                <Select value={docVisibilite} onValueChange={(val) => setDocVisibilite(val || 'membres')}>
                  <SelectTrigger className="h-9 bg-slate-50 border-slate-200 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">🌐 Public (Accessible à tous)</SelectItem>
                    <SelectItem value="membres">👥 Membres authentifiés</SelectItem>
                    <SelectItem value="participants">📅 Participants aux réunions</SelectItem>
                    <SelectItem value="commission">🤝 Membres de commission</SelectItem>
                    <SelectItem value="bureau_ca">🔒 Restreint Bureau & CA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDocModal(false)} className="h-8 text-xs rounded-lg">
              Annuler
            </Button>
            <Button 
              onClick={handleCreateDocument} 
              disabled={isSavingDoc || !docTitre || !docUrl}
              className="h-8 bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs rounded-lg"
            >
              {isSavingDoc ? 'Enregistrement...' : 'Enregistrer le document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: MODIFICATION DES DROITS DE VISIBILITÉ D'UN DOCUMENT ─── */}
      <Dialog open={showRightsModal} onOpenChange={setShowRightsModal}>
        <DialogContent className="rounded-3xl p-6 bg-white max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" /> Configurer la visibilité du document
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ajustez immédiatement qui est autorisé à consulter et télécharger ce fichier.
            </DialogDescription>
          </DialogHeader>

          {selectedDocForRights && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <p className="font-bold text-slate-900">{selectedDocForRights.titre}</p>
                <p className="text-[10px] text-slate-500">Niveau d&apos;accès actuel : {selectedDocForRights.visibilite}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-bold">Sélectionnez le nouveau niveau d&apos;accès</Label>
                <div className="space-y-2">
                  {[
                    { id: 'public', label: '🌐 Public (Consultable par tout visiteur du site)' },
                    { id: 'membres', label: '👥 Membres authentifiés (Membres en règle)' },
                    { id: 'participants', label: '📅 Participants aux réunions / Événements créés' },
                    { id: 'commission', label: '🤝 Membres de la commission concernée' },
                    { id: 'bureau_ca', label: '🔒 Restreint (Administrateurs & Bureau CA)' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleUpdateVisibility(opt.id)}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 text-xs font-semibold text-slate-800 transition-all flex items-center justify-between"
                    >
                      <span>{opt.label}</span>
                      {selectedDocForRights.visibilite === opt.id && (
                        <Badge className="bg-emerald-600 text-white text-[9px]">Actif</Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRightsModal(false)} className="h-8 text-xs rounded-lg">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
