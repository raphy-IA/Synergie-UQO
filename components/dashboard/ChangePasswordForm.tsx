'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { changePassword } from '@/app/actions/profile';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ChangePasswordForm() {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
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
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl text-slate-900 flex items-center gap-2">
          <Lock className="w-5 h-5 text-slate-500" />
          Modifier mon mot de passe
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="current_password">Mot de passe actuel</Label>
            <Input id="current_password" type="password" {...register('current_password', { required: "Mot de passe actuel requis" })} />
            {errors.current_password && <p className="text-xs text-red-500">{errors.current_password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password">Nouveau mot de passe</Label>
            <Input id="new_password" type="password" {...register('new_password', { required: "Nouveau mot de passe requis" })} />
            {errors.new_password && <p className="text-xs text-red-500">{errors.new_password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirmer le nouveau mot de passe</Label>
            <Input id="confirm_password" type="password" {...register('confirm_password', { required: "Confirmation requise" })} />
            {errors.confirm_password && <p className="text-xs text-red-500">{errors.confirm_password.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={isLoading} className="bg-slate-900 hover:bg-slate-950 text-white">
            {isLoading ? "Modification..." : "Modifier mon mot de passe"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
