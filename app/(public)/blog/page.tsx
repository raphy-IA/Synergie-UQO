import React from 'react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const CATEGORIES = [
  { slug: 'all', label: 'Tout' },
  { slug: 'education', label: 'Éducation' },
  { slug: 'carriere', label: 'Carrière' },
  { slug: 'entrepreneuriat', label: 'Entrepreneuriat' },
  { slug: 'politiques_lois', label: 'Politiques & Lois' },
  { slug: 'vie_associative', label: 'Vie Associative' },
];

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const supabase = createClient();
  const selectedCategory = searchParams.category || 'all';

  let query = supabase
    .from('articles')
    .select('id, slug, titre, resume, categorie, created_at')
    .eq('est_publie', true)
    .order('created_at', { ascending: false });

  if (selectedCategory !== 'all') {
    query = query.eq('categorie', selectedCategory);
  }

  const { data: articles, error } = await query;

  if (error) {
    console.error('Error fetching blog articles:', error);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-16 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-blue-950 tracking-tight">Actualités & Blog</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Suivez les dernières nouvelles de Synergie UQO, les opportunités professionnelles, et la vie associative.
        </p>
      </div>

      {/* Categories Filter Links */}
      <div className="flex flex-wrap gap-2 justify-center border-b pb-6">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={cat.slug === 'all' ? '/blog' : `/blog?category=${cat.slug}`}
            className={buttonVariants({
              variant: selectedCategory === cat.slug ? 'default' : 'outline',
              className: selectedCategory === cat.slug ? 'bg-blue-900 text-white font-bold' : 'text-slate-700 font-semibold'
            })}
          >
            {cat.label}
          </Link>
        ))}
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {!articles || articles.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-slate-500 bg-white border border-dashed rounded-xl">
            Aucun article disponible dans cette catégorie pour le moment.
          </div>
        ) : (
          articles.map((art) => (
            <Card key={art.id} className="hover:shadow-md transition-shadow flex flex-col justify-between">
              <CardHeader>
                <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">
                  {art.categorie.replace('_', ' ')}
                </span>
                <CardTitle className="text-lg font-bold text-slate-900 mt-1 line-clamp-2">
                  {art.titre}
                </CardTitle>
                <CardDescription className="line-clamp-3 text-slate-600 text-sm">
                  {art.resume}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-slate-400">
                Publié le {new Date(art.created_at).toLocaleDateString('fr-CA')}
              </CardContent>
              <div className="px-6 pb-6 pt-0">
                <Link
                  href={`/blog/${art.slug}`}
                  className={buttonVariants({
                    variant: 'link',
                    className: 'p-0 text-blue-900 hover:text-blue-950 font-bold'
                  })}
                >
                  Lire la suite →
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
