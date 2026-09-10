import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { CheckCircle2, Mail, Clock, ArrowRight, ShieldCheck, MailCheck } from 'lucide-react';

export default function AdhesionSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex flex-col justify-center items-center px-4 relative overflow-hidden py-12">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-lg w-full relative z-10 space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-extrabold tracking-tight text-blue-950">
              CEDP <span className="text-amber-500">UQO</span>
            </h1>
          </Link>
        </div>

        <Card className="bg-white shadow-xl shadow-slate-200/50 border-0 rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-900 via-amber-500 to-emerald-500" />
          <CardHeader className="flex flex-col items-center pt-8 pb-4 text-center px-6 sm:px-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-3 shadow-inner">
              <MailCheck className="w-8 h-8 text-blue-800" />
            </div>
            <CardTitle className="text-xl font-extrabold text-slate-900">
              Demande enregistrée !
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Votre candidature a bien été soumise. Veuillez suivre les étapes ci-dessous.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-slate-700 text-sm px-6 sm:px-8">
            {/* ÉTAPE 1 PRIORITAIRE : VALIDATION EMAIL */}
            <div className="p-4 bg-blue-50/70 border-2 border-blue-200 rounded-xl flex items-start gap-3.5 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5 shadow">
                1
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-blue-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-700" /> Validation de votre adresse courriel (Obligatoire)
                </h4>
                <p className="text-xs text-blue-900 leading-relaxed font-medium">
                  Un courriel de confirmation contenant un lien sécurisé a été envoyé à votre adresse. <strong>Veuillez ouvrir votre boîte de réception et cliquer sur le lien de confirmation</strong> afin de valider votre adresse courriel.
                </p>
                <p className="text-[11px] text-blue-700/80 italic pt-1 border-t border-blue-100">
                  💡 En environnement de test local, votre compte est automatiquement pré-validé.
                </p>
              </div>
            </div>

            {/* ÉTAPE 2 : EXAMEN PAR LE CA */}
            <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                2
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" /> Examen de votre candidature par le CA
                </h4>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Conformément aux statuts du CEDP - UQO, une fois votre courriel confirmé, votre dossier sera transmis pour validation par les administrateurs du Conseil d&apos;Administration (délai de 24 à 48 heures).
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2.5 px-6 sm:px-8 pb-8 pt-2">
            <Link
              href="/login"
              className={buttonVariants({
                variant: 'default',
                className: 'w-full h-11 bg-blue-950 hover:bg-blue-900 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-950/20'
              })}
            >
              Accéder à la page de connexion <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className={buttonVariants({
                variant: 'ghost',
                className: 'w-full h-10 text-slate-500 rounded-xl hover:bg-slate-50 text-xs'
              })}
            >
              Retour au site principal
            </Link>
          </CardFooter>
        </Card>

        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Données protégées conformément à la Loi 25</span>
        </div>
      </div>
    </div>
  );
}
