'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

interface Partner {
  id: string;
  nom: string;
  description: string;
  logo_url: string;
  site_web: string;
  niveau: string;
  actif: boolean;
}

export default function PartenairesPage() {
  const supabase = createClient();
  const [partenaires, setPartenaires] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    nomEntreprise: '',
    contactNom: '',
    email: '',
    telephone: '',
    message: '',
  });

  useEffect(() => {
    const fetchPartenaires = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('partenaires')
        .select('*')
        .eq('actif', true)
        .order('niveau', { ascending: true }); // On peut trier par niveau ou date

      if (data && !error) {
        setPartenaires(data);
      }
      setLoading(false);
    };

    fetchPartenaires();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // On insère une candidature de partenaire (ici on peut l'insérer dans la table partenaires avec actif = false)
    const { error } = await supabase
      .from('partenaires')
      .insert({
        nom: formData.nomEntreprise,
        description: `Contact: ${formData.contactNom} | Tel: ${formData.telephone} | Message: ${formData.message}`,
        logo_url: '/logos/placeholder.png', // Logo par défaut
        site_web: '',
        niveau: 'argent',
        actif: false, // En attente de validation admin
      });

    if (!error) {
      setSubmitted(true);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-16 space-y-16">
      {/* Introduction */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-blue-950 tracking-tight">Nos Partenaires</h1>
        <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
          Synergie UQO collabore avec des institutions et entreprises d'ici pour offrir des services d'excellence à sa communauté.
        </p>
      </section>

      {/* Sponsor Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <p className="col-span-3 text-center py-6 text-slate-400">Chargement des partenaires...</p>
        ) : partenaires.length === 0 ? (
          <p className="col-span-3 text-center py-6 text-slate-400">Aucun partenaire actif pour le moment.</p>
        ) : (
          partenaires.map((part) => (
            <Card key={part.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <CardHeader>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold self-start capitalize ${
                  part.niveau === 'platine'
                    ? 'bg-blue-100 text-blue-800'
                    : part.niveau === 'or'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-800'
                }`}>
                  Niveau {part.niveau}
                </span>
                <CardTitle className="text-lg font-bold text-slate-900 mt-2">{part.nom}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 space-y-2">
                <p>{part.description}</p>
                {part.site_web && (
                  <a href={part.site_web} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 font-bold hover:underline block">
                    Visiter le site web →
                  </a>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {/* Partnership Contact Form */}
      <section className="max-w-2xl mx-auto bg-white border rounded-2xl p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-blue-950">Devenir Partenaire</h2>
          <p className="text-slate-500 text-sm">Vous souhaitez soutenir la relève de l'UQO ? Remplissez ce formulaire.</p>
        </div>

        {submitted ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-lg">Demande reçue !</h3>
            <p className="text-sm">
              Merci de votre intérêt. Notre équipe de relations externes vous recontactera très prochainement.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nomEntreprise">Nom de l'entreprise ou organisme</Label>
              <Input
                id="nomEntreprise"
                required
                value={formData.nomEntreprise}
                onChange={(e) => setFormData({ ...formData, nomEntreprise: e.target.value })}
                placeholder="Ex: Entreprise UQO Inc."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactNom">Nom du contact</Label>
                <Input
                  id="contactNom"
                  required
                  value={formData.contactNom}
                  onChange={(e) => setFormData({ ...formData, contactNom: e.target.value })}
                  placeholder="Ex: Sophie Martin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Courriel professionnel</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Ex: s.martin@entreprise.ca"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                placeholder="Ex: 819-555-0199"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message ou proposition de collaboration</Label>
              <textarea
                id="message"
                required
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Décrivez brièvement comment vous souhaitez collaborer avec Synergie UQO..."
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white text-sm"
              />
            </div>

            <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold">
              Soumettre la demande
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
