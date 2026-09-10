import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { CheckCircle2, Clock, ArrowRight, ShieldCheck, MailCheck, UserCheck } from 'lucide-react';

export default function EmailConfirmedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50 flex flex-col justify-center items-center px-4 relative overflow-hidden py-12">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
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
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-blue-800 to-amber-500" />
          <CardHeader className="flex flex-col items-center pt-8 pb-4 text-center px-6 sm:px-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3 shadow-sm border border-emerald-100">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <CardTitle className="text-xl font-extrabold text-slate-900">
              Adresse courriel confirmée ! 🎉
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Votre adresse électronique a été validée avec succès.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-slate-700 text-sm px-6 sm:px-8">
            {/* ETAPE DU PROCESSUS D'EXAMEN DU CA */}
            <div className="p-5 bg-amber-50/70 border-2 border-amber-200/80 rounded-xl space-y-2.5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-extrabold text-amber-950 text-xs uppercase tracking-wider">
                  Processus d&apos;examen par le CA en cours
                </h4>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                Merci d&apos;avoir confirmé votre adresse courriel ! Conformément aux statuts du <strong>CEDP - UQO</strong>, votre demande d&apos;adhésion a été transmise aux administrateurs du Conseil d&apos;Administration.
              </p>
              <p className="text-xs text-amber-900 leading-relaxed">
                Cette vérification prend généralement entre <strong>24 et 48 heures</strong>.
              </p>
            </div>

            <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="font-bold text-blue-950 text-xs uppercase tracking-wider">Prochaine notification</h5>
                <p className="text-xs text-blue-900 leading-relaxed">
                  Dès que votre candidature aura été officiellement approuvée par le CA, vous recevrez un courriel de bienvenue avec les instructions pour vous connecter et régler votre cotisation afin d&apos;activer votre carte virtuelle de membre.
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
              Se connecter à mon espace membre <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className={buttonVariants({
                variant: 'ghost',
                className: 'w-full h-10 text-slate-500 rounded-xl hover:bg-slate-50 text-xs'
              })}
            >
              Retour à l&apos;accueil
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
