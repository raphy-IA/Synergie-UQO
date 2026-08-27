import React from 'react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { ArrowRight, BookOpen, GraduationCap, Shield, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = createClient();

  // Charger les 3 derniers articles de blog publiés
  const { data: articles } = await supabase
    .from('articles')
    .select('id, slug, titre, resume, categorie, created_at')
    .eq('est_publie', true)
    .order('created_at', { ascending: false })
    .limit(3);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.1),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.1),transparent_40%)]" />
        
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            Fédérer • Inspirer • Entreprendre
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-none">
            Synergie <span className="text-amber-500">UQO</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Le réseau officiel des étudiants, diplômés et jeunes professionnels de l'Université du Québec en Outaouais. Rejoignez une communauté active d'entraide et de mentorat.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/adhesion"
              className={buttonVariants({
                variant: 'default',
                size: 'lg',
                className: 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shadow-lg flex items-center gap-2'
              })}
            >
              Devenir membre <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className={buttonVariants({
                variant: 'outline',
                size: 'lg',
                className: 'border-white/20 text-white hover:bg-white/10 font-bold px-8 bg-transparent'
              })}
            >
              Accéder à mon espace
            </Link>
          </div>
        </div>
      </section>

      {/* Mission / Values Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl font-extrabold text-blue-950">Notre Mission & Vision</h2>
          <p className="text-slate-600">
            Synergie UQO vise à dynamiser le tissu professionnel de notre communauté en créant des ponts solides entre le monde universitaire et le marché du travail.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-xl shadow-sm border space-y-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-900" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Hub de Mentorat</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Mise en relation d'étudiants actuels avec des diplômés d'expérience pour guider leur insertion professionnelle et le développement de carrière.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl shadow-sm border space-y-4">
            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Insertion & Carrière</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Diffusion d'opportunités d'emplois, de stages, et conseils pratiques sur le réseautage en Outaouais et au Québec.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl shadow-sm border space-y-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Actualités & Veille</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Un centre d'information dédié aux politiques étudiantes, à l'entrepreneuriat jeunesse et à la vie de l'UQO.
            </p>
          </div>
        </div>
      </section>

      {/* Recent Blog Posts */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-extrabold text-blue-950">Dernières Actualités</h2>
            <p className="text-slate-500 text-sm">Suivez la vie associative et professionnelle à l'UQO.</p>
          </div>
          <Link
            href="/blog"
            className={buttonVariants({
              variant: 'ghost',
              className: 'text-blue-900 hover:text-blue-950 font-semibold gap-1 flex items-center'
            })}
          >
            Voir tous les articles <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {!articles || articles.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-slate-500 bg-white rounded-lg border border-dashed">
              Aucun article publié pour le moment.
            </div>
          ) : (
            articles.map((art) => (
              <Card key={art.id} className="hover:shadow-md transition-shadow flex flex-col justify-between">
                <CardHeader>
                  <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">
                    {art.categorie.replace('_', ' ')}
                  </span>
                  <CardTitle className="text-lg font-bold text-slate-900 line-clamp-2 mt-1">
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
                      className: 'p-0 text-blue-900 hover:text-blue-950 font-bold flex items-center gap-1'
                    })}
                  >
                    Lire la suite →
                  </Link>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
