import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { CheckCircle2, Mail, Clock, ArrowRight } from 'lucide-react';

export default function AdhesionSuccessPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const isExempt = searchParams.exempt === 'true';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4">
      <Card className="max-w-md w-full text-center shadow-xl border-t-4 border-t-emerald-500">
        <CardHeader className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Adhésion Enregistrée !
          </CardTitle>
          <CardDescription className="text-sm text-slate-600">
            {isExempt
              ? "Votre demande de membre d'honneur a été soumise avec succès."
              : "Le règlement de votre cotisation annuelle a été traité avec succès."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-slate-700 text-sm px-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-left flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-950">Statut : En attente d'approbation</h4>
              <p className="text-xs text-amber-800 mt-1">
                Conformément aux statuts de Synergie UQO, votre candidature doit être validée par les administrateurs du Conseil d'Administration. Cette vérification prend généralement moins de 24 à 48 heures.
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-left flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-950">Email de confirmation</h4>
              <p className="text-xs text-blue-800 mt-1">
                Une fois votre inscription approuvée, vous recevrez un courriel de bienvenue contenant un lien de connexion pour activer pleinement votre espace membre et obtenir votre carte virtuelle.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 pb-6">
          <Link
            href="/login"
            className={buttonVariants({
              variant: 'default',
              className: 'w-full bg-blue-900 hover:bg-blue-950 text-white flex items-center justify-center gap-2'
            })}
          >
            Aller vers l'authentification <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            className={buttonVariants({
              variant: 'ghost',
              className: 'w-full text-slate-700'
            })}
          >
            Retour à l'accueil
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
