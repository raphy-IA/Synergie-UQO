'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, Download, FolderOpen, Lock, Users, Calendar, Globe,
  Folder, Search, Filter
} from 'lucide-react';

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

export default function DocumentsLibraryClient() {
  const supabase = createClient();
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation & Search
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const fetchLibraryData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // 1. Fetch User Role & Commissions
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const role = prof?.role || 'membre';
    const adminUser = ['admin_ca', 'tresorier', 'superadmin'].includes(role);

    const { data: comms } = await supabase.from('membres_commissions').select('commission_id').eq('profile_id', user.id);
    const myCommIds = (comms || []).map(c => c.commission_id);

    // 2. Fetch Folders
    const { data: foldersData } = await supabase
      .from('document_folders')
      .select('*')
      .order('ordre', { ascending: true })
      .order('nom', { ascending: true });

    setFolders(foldersData || []);

    // 3. Fetch Documents with Relations
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
      // Filter based on strict permissions
      const allowedDocs = docsData.filter((doc: any) => {
        if (adminUser) return true;
        const vis = doc.visibilite || (doc.est_public ? 'public' : 'membres');
        
        if (vis === 'public') return true;
        if (vis === 'membres') return true;
        if (vis === 'bureau_ca') return adminUser;
        if (vis === 'commission' && doc.commission_id) return myCommIds.includes(doc.commission_id);
        if (vis === 'participants') {
          if (doc.commission_id) return myCommIds.includes(doc.commission_id);
          return true;
        }
        return true;
      });

      setDocuments(allowedDocs as any);
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
      {/* ─── BANNIÈRE D'EN-TÊTE CONSULTATION ─── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-500 absolute top-0 left-0 right-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-950 rounded-2xl border border-blue-100 shadow-xs">
              <FolderOpen className="w-6 h-6 text-blue-950" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                Bibliothèque de Documents
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Espace de consultation et de téléchargement des pièces officielles, statuts et comptes-rendus.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── RECHERCHE ET FILTRES ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Rechercher un document..."
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
              <SelectItem value="all">Tous les documents autorisés</SelectItem>
              <SelectItem value="public">🌐 Documents publics</SelectItem>
              <SelectItem value="membres">👥 Reservés aux membres</SelectItem>
              <SelectItem value="participants">📅 Réunions & Événements</SelectItem>
              <SelectItem value="commission">🤝 Mes commissions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── GRILLE DES DOSSIERS DE CLASSEMENT ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-500" /> Espaces de Classement
          </h2>
          {selectedFolderId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFolderId(null)}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900"
            >
              ← Voir tous les dossiers
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
                Catalogue général
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
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-28 ${
                  isSelected 
                    ? 'bg-blue-950 text-white border-blue-900 shadow-md' 
                    : 'bg-white text-slate-800 border-slate-200/80 hover:border-blue-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Folder className={`w-6 h-6 ${isSelected ? 'text-amber-400' : 'text-amber-500'}`} />
                  <Badge variant="outline" className={`text-[10px] font-bold ${isSelected ? 'border-white/20 text-slate-200' : ''}`}>
                    {count} docs
                  </Badge>
                </div>
                <div>
                  <p className="font-extrabold text-xs truncate">{f.nom}</p>
                  <p className={`text-[10px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                    {f.description || 'Dossier de classement'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── LISTE DES DOCUMENTS ─── */}
      <Card className="border-0 shadow-md rounded-3xl bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 px-6 py-5 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-950" />
              <div>
                <CardTitle className="text-base font-bold text-slate-950">
                  {currentFolder ? currentFolder.nom : 'Documents consultables'}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {displayedDocs.length} document(s) accessible(s)
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {loading ? (
            <div className="text-center text-slate-400 py-12 text-xs italic">
              Chargement de la bibliothèque...
            </div>
          ) : displayedDocs.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
              <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">Aucun document dans ce dossier.</p>
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
                            Mis à disposition le {new Date(doc.created_at).toLocaleDateString('fr-CA', { dateStyle: 'medium' })}
                          </span>
                        </div>
                      </div>
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

                    <Button
                      onClick={() => handleDownload(doc.file_url)}
                      className="h-8 bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs rounded-xl gap-1.5 px-3 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> Télécharger
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
