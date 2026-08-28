import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { CheckCircle2, Mail, Clock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AdhesionSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full relative z-10 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-blue-950">
            Synergie <span className="text-amber-500">UQO</span>
          </h1>
        </div>

        <Card className="bg-white shadow-xl shadow-slate-200/50 border-0 rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-900 to-emerald-500" />
          <CardHeader className="flex flex-col items-center pt-8 pb-4 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">
              Demande enregistrée !
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Votre candidature a été soumise avec succès pour examen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700 text-sm px-6 sm:px-8">
            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-950 text-xs uppercase tracking-wider">Statut : En cours d&apos;examen</h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Conformément aux statuts de Synergie UQO, votre candidature doit être validée par les administrateurs du Conseil d&apos;Administration. Cette vérification prend généralement moins de 24 à 48 heures.
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-950 text-xs uppercase tracking-wider">Confirmation & Étape suivante</h4>
                <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                  Une fois votre inscription approuvée par le CA, vous recevrez un courriel de bienvenue pour activer votre espace membre. Vous pourrez alors régler votre cotisation annuelle pour générer votre carte virtuelle.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 px-6 sm:px-8 pb-8 pt-2">
            <Link
              href="/login"
              className={buttonVariants({
                variant: 'default',
                className: 'w-full h-11 bg-blue-950 hover:bg-blue-900 text-white font-semibold rounded-lg flex items-center justify-center gap-2 shadow-md shadow-blue-950/20'
              })}
            >
              Aller vers la connexion <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className={buttonVariants({
                variant: 'ghost',
                className: 'w-full h-11 text-slate-550 rounded-lg hover:bg-slate-50'
              })}
            >
              Retour à l&apos;accueil
            </Link>
          </CardFooter>
        </Card>

        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Données protégées par la Loi 25</span>
        </div>
      </div>
    </div>
  );
}
