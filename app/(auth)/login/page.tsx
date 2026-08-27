'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { signIn } from '@/app/actions/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Lock, Mail } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await signIn(data);
      if (res?.error) {
        setErrorMsg(typeof res.error === 'string' ? res.error : "Erreur de connexion");
      } else {
        // Redirect to dashboard (middleware will handle routing)
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-extrabold text-blue-900 tracking-tight">
            Synergie <span className="text-amber-500">UQO</span>
          </Link>
          <p className="mt-2 text-sm text-gray-600">
            Connectez-vous à votre espace privé
          </p>
        </div>

        <Card className="border-t-4 border-t-blue-900 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-900">Connexion</CardTitle>
            <CardDescription>
              Entrez vos identifiants pour accéder à l'espace membre ou administrateur.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-slate-400" /> Courriel
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="Ex: jean.tremblay@uqo.ca"
                  {...register('email')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-slate-400" /> Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  {...register('password')}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 border-t pt-4">
              <Button type="submit" disabled={isLoading} className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold">
                {isLoading ? "Connexion en cours..." : "Se connecter"}
              </Button>
              <div className="text-center text-xs text-slate-600">
                Vous n'êtes pas encore membre ?{' '}
                <Link href="/adhesion" className="text-blue-900 hover:underline font-semibold">
                  Adhérer maintenant
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
