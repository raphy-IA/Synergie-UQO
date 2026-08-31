'use client';

import React, { useState } from 'react';
import { saveArticle, deleteArticle } from '@/app/actions/admin';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { Edit, Trash2, Plus, ArrowLeft, Image, Clock, Search, Tag } from 'lucide-react';

interface Article {
  id: string;
  slug: string;
  titre: string;
  resume: string;
  contenu: string;
  categorie: 'education' | 'carriere' | 'entrepreneuriat' | 'politiques_lois' | 'vie_associative';
  est_publie: boolean;
  image_couverture?: string | null;
  temps_lecture?: number;
  seo_titre?: string | null;
  seo_description?: string | null;
  tags?: string[];
  created_at: string;
}

interface ArticleEditorProps {
  initialArticles: Article[];
}

export default function ArticleEditor({ initialArticles }: ArticleEditorProps) {
  const supabase = createClient();
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
  };

  const handleNew = () => {
    setEditingArticle({
      titre: '',
      slug: '',
      resume: '',
      contenu: '',
      categorie: 'education',
      est_publie: false,
      temps_lecture: 3,
      seo_titre: '',
      seo_description: '',
      tags: [],
      image_couverture: null
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingArticle) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const uniqueId = Math.random().toString(36).substring(2, 9);
      const storagePath = `covers/${uniqueId}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('articles')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('articles')
        .getPublicUrl(storagePath);

      setEditingArticle(prev => ({
        ...prev,
        image_couverture: publicUrl
      }));
    } catch (err) {
      console.error(err);
      alert("Erreur lors du téléversement de l'image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    setIsLoading(true);
    const res = await deleteArticle(id);
    setIsLoading(false);

    if (res?.success) {
      setArticles((prev) => prev.filter((a) => a.id !== id));
      alert('Article supprimé.');
    } else {
      alert(res?.error || 'Erreur lors de la suppression.');
    }
  };

  const generateSlug = (titre: string) => {
    return titre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9\s-]/g, '') // remove invalid chars
      .replace(/\s+/g, '-') // replace spaces with hyphens
      .replace(/-+/g, '-'); // collapse duplicate hyphens
  };

  const handleTitleChange = (titre: string) => {
    if (editingArticle) {
      setEditingArticle((prev) => ({
        ...prev,
        titre,
        slug: prev?.id ? prev.slug : generateSlug(titre), // Auto-generate slug only on create
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle?.titre || !editingArticle?.slug || !editingArticle?.resume || !editingArticle?.contenu) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setIsLoading(true);
    const res = await saveArticle({
      id: editingArticle.id,
      slug: editingArticle.slug,
      titre: editingArticle.titre,
      resume: editingArticle.resume,
      contenu: editingArticle.contenu,
      categorie: editingArticle.categorie || 'education',
      est_publie: editingArticle.est_publie || false,
      image_couverture: editingArticle.image_couverture || undefined,
      temps_lecture: editingArticle.temps_lecture ?? 3,
      seo_titre: editingArticle.seo_titre || undefined,
      seo_description: editingArticle.seo_description || undefined,
      tags: editingArticle.tags || [],
    });
    setIsLoading(false);

    if (res?.success) {
      alert('Article enregistré avec succès !');
      window.location.reload(); // Refresh the list
    } else {
      alert(res?.error || "Une erreur s'est produite.");
    }
  };

  if (editingArticle) {
    return (
      <Card className="max-w-6xl mx-auto shadow-xl border-slate-100 rounded-3xl bg-slate-50/20 overflow-hidden">
        <form onSubmit={handleSubmit}>
          <CardHeader className="flex flex-row items-center justify-between bg-white border-b px-8 py-5">
            <div>
              <CardTitle className="text-xl font-extrabold text-slate-900">{editingArticle.id ? "Modifier l'article" : 'Créer un article'}</CardTitle>
            </div>
            <Button type="button" variant="ghost" onClick={() => setEditingArticle(null)} className="gap-2 font-bold text-slate-600">
              <ArrowLeft className="w-4 h-4" /> Retour
            </Button>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2 space-y-5 bg-white p-6 border rounded-2xl shadow-sm">
                <div className="space-y-2">
                  <Label htmlFor="titre" className="font-bold text-slate-800 text-xs uppercase tracking-wider">Titre de l'article *</Label>
                  <Input
                    id="titre"
                    required
                    value={editingArticle.titre || ''}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Ex: Lancement des activités de mentorat Synergie"
                    className="h-11 border-slate-200 focus-visible:ring-blue-900 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug" className="font-bold text-slate-800 text-xs uppercase tracking-wider">Slug (URL de l'article) *</Label>
                  <Input
                    id="slug"
                    required
                    value={editingArticle.slug || ''}
                    onChange={(e) => setEditingArticle((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="ex-lancement-mentorat"
                    className="h-11 border-slate-200 focus-visible:ring-blue-900 rounded-xl text-slate-500 font-mono text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resume" className="font-bold text-slate-800 text-xs uppercase tracking-wider">Résumé succinct *</Label>
                  <Textarea
                    id="resume"
                    required
                    rows={2}
                    value={editingArticle.resume || ''}
                    onChange={(e) => setEditingArticle((prev) => ({ ...prev, resume: e.target.value }))}
                    placeholder="Entrez un court résumé d'accroche pour la page d'accueil ou les listes..."
                    className="border-slate-200 focus-visible:ring-blue-900 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contenu" className="font-bold text-slate-800 text-xs uppercase tracking-wider">Corps de l'article (Markdown) *</Label>
                  <Textarea
                    id="contenu"
                    required
                    rows={15}
                    value={editingArticle.contenu || ''}
                    onChange={(e) => setEditingArticle((prev) => ({ ...prev, contenu: e.target.value }))}
                    className="min-h-[400px] border-slate-200 focus-visible:ring-blue-900 rounded-xl font-mono text-xs leading-relaxed"
                    placeholder="Rédigez l'article complet ici. Le format Markdown est entièrement supporté pour structurer le texte."
                  />
                </div>
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                
                {/* Media & Settings */}
                <div className="p-5 border rounded-2xl bg-white shadow-sm space-y-4">
                  <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                    <Image className="w-4 h-4 text-amber-500" /> Paramètres & Médias
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="categorie" className="font-semibold text-slate-700 text-xs">Catégorie</Label>
                    <Select
                      value={editingArticle.categorie || 'education'}
                      onValueChange={(val: any) => setEditingArticle((prev) => ({ ...prev, categorie: val }))}
                    >
                      <SelectTrigger className="w-full h-10 bg-slate-50 border-slate-200 rounded-lg">
                        <SelectValue placeholder="Choisir une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="education">Éducation / Formation</SelectItem>
                        <SelectItem value="carriere">Carrière / Emploi</SelectItem>
                        <SelectItem value="entrepreneuriat">Entrepreneuriat</SelectItem>
                        <SelectItem value="politiques_lois">Politiques & Lois</SelectItem>
                        <SelectItem value="vie_associative">Vie Associative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temps_lecture" className="font-semibold text-slate-700 text-xs">Temps de lecture (minutes)</Label>
                    <div className="relative">
                      <Input
                        id="temps_lecture"
                        type="number"
                        min={1}
                        value={editingArticle.temps_lecture ?? 3}
                        onChange={(e) => setEditingArticle((prev) => ({ ...prev, temps_lecture: parseInt(e.target.value) || 1 }))}
                        className="pl-9 h-10 bg-slate-50 border-slate-200 rounded-lg"
                      />
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-slate-700 text-xs">Image de couverture</Label>
                    {editingArticle.image_couverture && (
                      <div className="aspect-video w-full rounded-xl overflow-hidden border relative mb-2 group shadow-sm bg-slate-50">
                        <img src={editingArticle.image_couverture} alt="Couverture" className="object-cover w-full h-full" />
                        <button
                          type="button"
                          onClick={() => setEditingArticle(prev => ({ ...prev, image_couverture: null }))}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xs transition-opacity"
                        >
                          Supprimer l'image
                        </button>
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={handleImageUpload}
                      className="bg-slate-50 border-slate-200 text-xs cursor-pointer"
                    />
                    {uploadingImage && <p className="text-[10px] text-amber-500 font-bold animate-pulse">Téléchargement de l'image...</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags" className="font-semibold text-slate-700 text-xs">Tags (mots-clés)</Label>
                    <div className="relative">
                      <Input
                        id="tags"
                        value={editingArticle.tags?.join(', ') || ''}
                        onChange={(e) => setEditingArticle((prev) => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                        placeholder="uqo, actualite, mentorat"
                        className="pl-9 h-10 bg-slate-50 border-slate-200 rounded-lg text-xs"
                      />
                      <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>
                </div>

                {/* Optimisation SEO */}
                <div className="p-5 border rounded-2xl bg-white shadow-sm space-y-4">
                  <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                    <Search className="w-4 h-4 text-blue-900" /> Optimisation SEO
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="seo_titre" className="font-semibold text-slate-700 text-xs">Titre SEO (Balise Title)</Label>
                    <Input
                      id="seo_titre"
                      value={editingArticle.seo_titre || ''}
                      onChange={(e) => setEditingArticle((prev) => ({ ...prev, seo_titre: e.target.value }))}
                      placeholder="Identique au titre principal par défaut..."
                      className="h-10 bg-slate-50 border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo_desc" className="font-semibold text-slate-700 text-xs">Description SEO (Meta Description)</Label>
                    <Textarea
                      id="seo_desc"
                      rows={3}
                      value={editingArticle.seo_description || ''}
                      onChange={(e) => setEditingArticle((prev) => ({ ...prev, seo_description: e.target.value }))}
                      placeholder="Texte accrocheur pour le moteur de recherche..."
                      className="bg-slate-50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 border rounded-2xl bg-white shadow-sm">
                  <Checkbox
                    id="est_publie"
                    checked={editingArticle.est_publie || false}
                    onCheckedChange={(checked) => setEditingArticle((prev) => ({ ...prev, est_publie: checked === true }))}
                    className="w-5 h-5 accent-blue-900"
                  />
                  <Label htmlFor="est_publie" className="font-bold text-slate-800 cursor-pointer text-xs uppercase tracking-wider">
                    Publier immédiatement
                  </Label>
                </div>

              </div>

            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 bg-white border-t px-8 py-5">
            <Button type="button" variant="outline" onClick={() => setEditingArticle(null)} disabled={isLoading} className="font-bold">
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-900 hover:bg-blue-950 text-white font-bold px-6">
              {isLoading ? "Enregistrement..." : "Enregistrer l'article"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleNew} className="bg-blue-900 hover:bg-blue-950 text-white gap-2">
          <Plus className="w-4 h-4" /> Nouvel article
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        {articles.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Aucun article enregistré.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date création</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell className="font-semibold text-slate-900 max-w-[300px] truncate">
                    {article.titre}
                  </TableCell>
                  <TableCell className="capitalize text-slate-700">{article.categorie.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        article.est_publie ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {article.est_publie ? 'Publié' : 'Brouillon'}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {new Date(article.created_at).toLocaleDateString('fr-CA')}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(article)} className="gap-1">
                      <Edit className="w-3.5 h-3.5" /> Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(article.id)}
                      disabled={isLoading}
                      className="gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
