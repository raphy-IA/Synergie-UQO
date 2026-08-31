import React from 'react';
import { createClient } from '@/lib/supabase/server';
import ArticleEditor from '@/components/admin/ArticleEditor';

export const dynamic = 'force-dynamic';

export default async function ArticlesPage() {
  const supabase = createClient();

  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, slug, titre, resume, contenu, categorie, est_publie, image_couverture, temps_lecture, seo_titre, seo_description, tags, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching articles:', error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Gestion des Articles (CMS)</h1>
        <p className="text-slate-600">Créez, modifiez ou supprimez les articles d'actualités et de blog.</p>
      </div>

      <ArticleEditor initialArticles={articles || []} />
    </div>
  );
}
