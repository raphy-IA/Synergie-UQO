import React from 'react';
import ChangePasswordForm from '@/components/dashboard/ChangePasswordForm';

export const dynamic = 'force-dynamic';

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Sécurité</h1>
        <p className="text-slate-600">Modifiez votre mot de passe de connexion.</p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
