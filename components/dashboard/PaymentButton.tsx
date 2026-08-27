'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createAdhesionPaymentSession } from '@/app/actions/adhesion';
import { CreditCard, Loader2 } from 'lucide-react';

export default function PaymentButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePayment = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await createAdhesionPaymentSession();
      if (res?.error) {
        setErrorMsg(res.error);
      } else if (res?.redirectUrl) {
        window.location.href = res.redirectUrl;
      }
    } catch (err) {
      setErrorMsg("Une erreur s'est produite lors de l'initialisation du paiement.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2 w-full">
      <Button
        onClick={handlePayment}
        disabled={isLoading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 text-base flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Préparation de la redirection...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" /> Régler ma cotisation annuelle
          </>
        )}
      </Button>
      {errorMsg && (
        <p className="text-xs text-red-500 text-center font-semibold mt-1">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
