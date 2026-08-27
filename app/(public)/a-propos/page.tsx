import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Award, BookOpen, ShieldAlert, Users2 } from 'lucide-react';

export default function AProposPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 space-y-16">
      {/* Introduction */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-blue-950 tracking-tight">À Propos de Synergie UQO</h1>
        <p className="text-lg text-slate-650 max-w-3xl mx-auto leading-relaxed">
          Synergie UQO est un organisme autonome à but non lucratif fondé par et pour la communauté de l'Université du Québec en Outaouais.
        </p>
      </section>

      {/* History & Goals */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-blue-950">Notre Histoire</h2>
          <p className="text-slate-600 leading-relaxed text-sm">
            Née de la volonté de fédérer les forces vives de l'université (campus de Gatineau et de Saint-Jérôme), Synergie UQO a été créée pour répondre au besoin d'un espace de réseautage moderne, dynamique et centré sur l'entraide professionnelle.
          </p>
          <p className="text-slate-600 leading-relaxed text-sm">
            Aujourd'hui, l'association rassemble des centaines de membres engagés dans des projets de mentorat, d'entrepreneuriat et d'insertion sur le marché de l'emploi québécois.
          </p>
        </div>
        <div className="bg-blue-900/5 border border-blue-900/10 p-8 rounded-2xl space-y-4">
          <h3 className="text-xl font-bold text-blue-950">Nos 3 Piliers Fondamentaux</h3>
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold">✓</span>
              <strong>Fidélisation active :</strong> Connecter les diplômés avec leur Alma Mater.
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold">✓</span>
              <strong>Insertion professionnelle :</strong> Faciliter les transitions d'études vers la carrière.
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold">✓</span>
              <strong>Éthique & Gouvernance :</strong> Transparence absolue et démocratie participative.
            </li>
          </ul>
        </div>
      </section>

      {/* CA Structure */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl font-bold text-blue-950">Notre Conseil d'Administration</h2>
          <p className="text-slate-500 text-sm">Les membres qui veillent à l'administration de l'association.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="text-center">
            <CardHeader className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <Users2 className="w-8 h-8 text-blue-900" />
              </div>
              <CardTitle className="text-base font-bold">Présidence</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">
              Assure la direction générale, les relations publiques et la représentation légale.
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <Award className="w-8 h-8 text-amber-500" />
              </div>
              <CardTitle className="text-base font-bold">Secrétariat Général</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">
              Responsable de la conformité réglementaire (Loi 25), des procès-verbaux et de la gouvernance.
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <BookOpen className="w-8 h-8 text-emerald-600" />
              </div>
              <CardTitle className="text-base font-bold">Trésorerie</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">
              Gère les comptes annuels, les adhésions Stripe et la publication des rapports financiers.
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
