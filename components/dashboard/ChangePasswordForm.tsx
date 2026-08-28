'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { changePassword } from '@/app/actions/profile';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function ChangePasswordForm() {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (data.new_password !== data.confirm_password) {
      setErrorMsg("Le nouveau mot de passe et la confirmation ne correspondent pas.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await changePassword({ 
        current_password: data.current_password, 
        new_password: data.new_password 
      });
      if (res?.error) {
        setErrorMsg(res.error as string);
      } else if (res?.success) {
        setSuccessMsg("Votre mot de passe a été modifié avec succès !");
        reset();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto shadow-xl border-0 rounded-2xl overflow-hidden bg-white">
      <div className="h-1.5 bg-gradient-to-r from-blue-900 to-amber-500" />
      <CardHeader className="space-y-1.5 px-6 sm:px-8 pt-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-slate-900">
              Modifier mon mot de passe
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Assurez la sécurité de votre compte avec un mot de passe fort.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-5 px-6 sm:px-8 pt-4">
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="current_password text-slate-700">Mot de passe actuel</Label>
            <Input 
              id="current_password" 
              type="password" 
              placeholder="••••••••"
              className="h-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 transition-colors rounded-lg"
              {...register('current_password', { required: "Mot de passe actuel requis" })} 
            />
            {errors.current_password && <p className="text-xs text-red-500 font-semibold">{errors.current_password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new_password text-slate-700">Nouveau mot de passe</Label>
            <Input 
              id="new_password" 
              type="password" 
              placeholder="Minimum 6 caractères"
              className="h-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 transition-colors rounded-lg"
              {...register('new_password', { required: "Nouveau mot de passe requis" })} 
            />
            {errors.new_password && <p className="text-xs text-red-500 font-semibold">{errors.new_password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm_password text-slate-700">Confirmer le nouveau mot de passe</Label>
            <Input 
              id="confirm_password" 
              type="password" 
              placeholder="••••••••"
              className="h-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 transition-colors rounded-lg"
              {...register('confirm_password', { required: "Confirmation requise" })} 
            />
            {errors.confirm_password && <p className="text-xs text-red-500 font-semibold">{errors.confirm_password.message}</p>}
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start gap-3 mt-2">
            <ShieldAlert className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Votre mot de passe doit comporter au moins 6 caractères. Évitez d&apos;utiliser des mots de passe simples ou réutilisés sur d&apos;autres sites.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t border-slate-100 px-6 sm:px-8 py-5 bg-slate-50/50">
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="bg-blue-950 hover:bg-blue-900 text-white font-semibold rounded-lg px-6 shadow-md"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Modification...
              </span>
            ) : (
              "Modifier mon mot de passe"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
