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
import { Edit, Trash2, Plus, ArrowLeft } from 'lucide-react';

interface Article {
  id: string;
  slug: string;
  titre: string;
  resume: string;
  contenu: string;
  categorie: 'education' | 'carriere' | 'entrepreneuriat' | 'politiques_lois' | 'vie_associative';
  est_publie: boolean;
  created_at: string;
}

interface ArticleEditorProps {
  initialArticles: Article[];
}

export default function ArticleEditor({ initialArticles }: ArticleEditorProps) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    });
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
      <Card className="max-w-3xl mx-auto shadow-md">
        <form onSubmit={handleSubmit}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingArticle.id ? "Modifier l'article" : 'Créer un article'}</CardTitle>
            <Button type="button" variant="ghost" onClick={() => setEditingArticle(null)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Retour
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titre">Titre de l'article</Label>
              <Input
                id="titre"
                required
                value={editingArticle.titre || ''}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Ex: Lancement des activités de mentorat Synergie"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL de l'article)</Label>
              <Input
                id="slug"
                required
                value={editingArticle.slug || ''}
                onChange={(e) => setEditingArticle((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="ex-lancement-mentorat"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categorie">Catégorie</Label>
              <Select
                value={editingArticle.categorie || 'education'}
                onValueChange={(val: any) => setEditingArticle((prev) => ({ ...prev, categorie: val }))}
              >
                <SelectTrigger className="w-full">
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
              <Label htmlFor="resume">Résumé succinct (SEO & Liste)</Label>
              <Input
                id="resume"
                required
                value={editingArticle.resume || ''}
                onChange={(e) => setEditingArticle((prev) => ({ ...prev, resume: e.target.value }))}
                placeholder="Entrez un court résumé accrocheur..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contenu">Contenu riche (Format texte libre/Markdown)</Label>
              <textarea
                id="contenu"
                required
                rows={12}
                value={editingArticle.contenu || ''}
                onChange={(e) => setEditingArticle((prev) => ({ ...prev, contenu: e.target.value }))}
                className="w-full min-h-[300px] p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                placeholder="Écrivez le contenu de votre article ici..."
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="est_publie"
                checked={editingArticle.est_publie || false}
                onCheckedChange={(checked) => setEditingArticle((prev) => ({ ...prev, est_publie: checked === true }))}
              />
              <Label htmlFor="est_publie" className="font-semibold text-slate-800 cursor-pointer">
                Publier immédiatement (visible sur le site public)
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setEditingArticle(null)} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-900 hover:bg-blue-950 text-white">
              Enregistrer
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
