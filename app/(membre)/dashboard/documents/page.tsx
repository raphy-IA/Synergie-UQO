'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, Download, FolderOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Document {
  id: string;
  titre: string;
  description: string;
  file_url: string;
  categorie: string;
  created_at: string;
  commission_id?: string | null;
  evenement_id?: string | null;
  tache_id?: string | null;
  commissions?: {
    nom: string;
  } | null;
  evenements?: {
    titre: string;
  } | null;
  taches?: {
    titre: string;
  } | null;
}

export default function DocumentsPage() {
  const supabase = createClient();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        commissions:commission_id (nom),
        evenements:evenement_id (titre),
        taches:tache_id (titre)
      `)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setDocuments(data as any);
    } else {
      // Seed initial files if none are present
      const defaultDocs = [
        { titre: 'Statuts constitutionnels de Synergie UQO', description: 'Version officielle déposée au registraire des entreprises.', file_url: '/docs/statuts.pdf', categorie: 'statuts' },
        { titre: 'Règlement général N. 1', description: 'Règlement d&apos;administration interne de l&apos;association.', file_url: '/docs/reglement_general.pdf', categorie: 'reglement' },
        { titre: 'Procès-verbal de l&apos;Assemblée Générale de constitution', description: 'PV officiel de la réunion du 27 août 2026.', file_url: '/docs/pv_ag_constitutive.pdf', categorie: 'pv_ag' }
      ];
      await supabase.from('documents').insert(defaultDocs);
      const { data: refetched } = await supabase
        .from('documents')
        .select(`
          *,
          commissions:commission_id (nom),
          evenements:evenement_id (titre),
          taches:tache_id (titre)
        `)
        .order('created_at', { ascending: false });
      if (refetched) setDocuments(refetched as any);
    }
    setLoading(false);
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

  const renderDocsList = (cat: string) => {
    const filtered = cat === 'all' ? documents : documents.filter(d => d.categorie === cat);

    if (filtered.length === 0) {
      return (
        <div className="text-center text-slate-400 py-12 border border-dashed rounded-xl">
          Aucun document disponible dans cette catégorie.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {filtered.map((doc) => (
          <Card key={doc.id} className="border border-slate-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow flex items-center justify-between p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-blue-900" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-900 leading-tight">{doc.titre}</h4>
                {doc.description && <p className="text-xs text-slate-500 leading-relaxed">{doc.description}</p>}
                
                {/* Context badge/origin */}
                {(doc.commissions || doc.evenements || doc.taches) && (
                  <div className="flex flex-wrap gap-1 pt-1.5 pb-0.5">
                    {doc.commissions && (
                      <span className="text-[9px] bg-blue-50 text-blue-800 font-extrabold px-2 py-0.5 rounded">
                        Commission: {doc.commissions.nom}
                      </span>
                    )}
                    {doc.evenements && (
                      <span className="text-[9px] bg-amber-50 text-amber-800 font-extrabold px-2 py-0.5 rounded">
                        Événement: {doc.evenements.titre}
                      </span>
                    )}
                    {doc.taches && (
                      <span className="text-[9px] bg-emerald-50 text-emerald-800 font-extrabold px-2 py-0.5 rounded">
                        Tâche: {doc.taches.titre}
                      </span>
                    )}
                  </div>
                )}
                
                <span className="inline-block text-[9px] text-slate-400 block pt-1">Ajouté le {new Date(doc.created_at).toLocaleDateString('fr-CA')}</span>
              </div>
            </div>
            <button
              onClick={() => handleDownload(doc.file_url)}
              className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-blue-900 hover:bg-blue-900 hover:text-white transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-blue-950">Bibliothèque de Documents</h1>

      {loading ? (
        <p className="text-slate-400">Chargement des documents...</p>
      ) : (
        <Tabs defaultValue="all" className="w-full flex flex-col gap-4">
          <TabsList className="grid w-full grid-cols-5 bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg text-xs font-bold py-2">Tous</TabsTrigger>
            <TabsTrigger value="statuts" className="rounded-lg text-xs font-bold py-2">Statuts</TabsTrigger>
            <TabsTrigger value="reglement" className="rounded-lg text-xs font-bold py-2">Règlements</TabsTrigger>
            <TabsTrigger value="pv_ag" className="rounded-lg text-xs font-bold py-2">Procès-Verbaux</TabsTrigger>
            <TabsTrigger value="rapport_financier" className="rounded-lg text-xs font-bold py-2">Finances</TabsTrigger>
          </TabsList>

          <TabsContent value="all">{renderDocsList('all')}</TabsContent>
          <TabsContent value="statuts">{renderDocsList('statuts')}</TabsContent>
          <TabsContent value="reglement">{renderDocsList('reglement')}</TabsContent>
          <TabsContent value="pv_ag">{renderDocsList('pv_ag')}</TabsContent>
          <TabsContent value="rapport_financier">{renderDocsList('rapport_financier')}</TabsContent>
        </Tabs>
      )}
    </div>
  );
}
