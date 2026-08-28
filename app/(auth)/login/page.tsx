'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { signIn } from '@/app/actions/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ArrowRight, Lock, LogIn, Mail, ShieldCheck, Users } from 'lucide-react';
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
        // Redirection intelligente selon le rôle
        const role = (res as any).role;
        if (['admin_ca', 'tresorier', 'superadmin'].includes(role)) {
          window.location.href = '/admin';
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full mx-auto relative z-10">
        {/* Logo / Header */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Synergie <span className="text-amber-400">UQO</span>
            </h1>
          </Link>
          <p className="mt-3 text-sm text-blue-200/80">
            Association des étudiants et professionnels de l&apos;UQO
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-600 via-blue-800 to-amber-500" />
          <CardHeader className="pb-2 pt-8 px-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-950 flex items-center justify-center">
                <LogIn className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">Connexion</CardTitle>
                <CardDescription className="text-slate-500 text-xs">
                  Espace membre & administrateur
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-5 px-8 pt-2">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2 animate-in fade-in duration-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Adresse courriel
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="jean.tremblay@uqo.ca"
                  className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 transition-colors rounded-lg"
                  {...register('email')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 transition-colors rounded-lg"
                  {...register('password')}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-5 px-8 pb-8 pt-3">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-blue-950 hover:bg-blue-900 text-white font-semibold rounded-lg shadow-lg shadow-blue-950/25 transition-all hover:shadow-xl hover:shadow-blue-950/30"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connexion...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Se connecter <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>

              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-slate-400">ou</span>
                </div>
              </div>

              <Link
                href="/adhesion"
                className="w-full flex items-center justify-center gap-2 h-11 border-2 border-amber-400/50 text-amber-700 hover:bg-amber-50 hover:border-amber-400 font-semibold rounded-lg transition-all text-sm"
              >
                <Users className="w-4 h-4" />
                Devenir membre de Synergie UQO
              </Link>
            </CardFooter>
          </form>
        </Card>

        {/* Footer info */}
        <div className="mt-8 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-blue-200/60 text-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Connexion sécurisée et chiffrée</span>
          </div>
          <Link href="/" className="text-xs text-blue-300/50 hover:text-blue-200 transition-colors">
            ← Retour au site public
          </Link>
        </div>
      </div>
    </div>
  );
}
