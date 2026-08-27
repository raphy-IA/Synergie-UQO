import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const supabase = createClient();
  const { data: article } = await supabase
    .from('articles')
    .select('titre, resume')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!article) {
    return {
      title: 'Article introuvable | Synergie UQO',
    };
  }

  return {
    title: `${article.titre} | Synergie UQO`,
    description: article.resume,
  };
}

export default async function ArticleReadPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  const { data: article, error } = await supabase
    .from('articles')
    .select('id, titre, resume, contenu, categorie, created_at, profiles(prenom, nom)')
    .eq('slug', params.slug)
    .maybeSingle();

  if (error || !article) {
    notFound();
  }

  // Handle Supabase join types mapping
  const author = article.profiles as any;

  return (
    <article className="max-w-3xl mx-auto px-4 py-16 space-y-8">
      <Link
        href="/blog"
        className={buttonVariants({
          variant: 'ghost',
          className: 'gap-2 inline-flex items-center text-slate-600 hover:text-slate-900'
        })}
      >
        <ArrowLeft className="w-4 h-4" /> Retour aux actualités
      </Link>

      <div className="space-y-4">
        <span className="text-xs uppercase font-extrabold text-amber-600 tracking-wider">
          {article.categorie.replace('_', ' ')}
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
          {article.titre}
        </h1>
        <div className="flex flex-wrap gap-4 text-sm text-slate-500 border-y py-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(article.created_at).toLocaleDateString('fr-CA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          {author && (
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              Par {author.prenom} {author.nom}
            </span>
          )}
        </div>
      </div>

      <div className="text-lg font-medium text-slate-700 border-l-4 border-amber-500 pl-4 italic">
        {article.resume}
      </div>

      <div className="prose max-w-none text-slate-800 leading-relaxed whitespace-pre-line text-base">
        {article.contenu}
      </div>
    </article>
  );
}
