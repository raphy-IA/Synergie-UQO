'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Award, Calendar, CheckCircle2, ShieldCheck, User } from 'lucide-react';

interface MemberCardQRProps {
  prenom: string;
  nom: string;
  email: string;
  categorie: string;
  statut_adhesion: string;
  qr_token: string;
  date_expiration_adhesion: string | null;
  badgeStatus?: 'valide' | 'grace' | 'invalide';
  badgeLabel?: string;
}

export default function MemberCardQR({
  prenom,
  nom,
  email,
  categorie,
  statut_adhesion,
  qr_token,
  date_expiration_adhesion,
  badgeStatus = 'valide',
  badgeLabel,
}: MemberCardQRProps) {
  const verifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify-member?token=${qr_token}`
    : `https://synergie-uqo.ca/verify-member?token=${qr_token}`;

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden rounded-2xl border-none shadow-2xl bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white relative">
      {/* Decorative Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 rounded-full opacity-10 blur-xl -mr-10 -mt-10" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500 rounded-full opacity-10 blur-xl -ml-10 -mb-10" />

      <CardContent className="p-6 space-y-6">
        {/* Card Header */}
        <div className="flex justify-between items-start border-b border-white/10 pb-4">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight">
              Synergie <span className="text-amber-500">UQO</span>
            </h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">
              Carte de membre numérique
            </p>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
              badgeStatus === 'valide'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : badgeStatus === 'grace'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-red-500/20 text-red-300 border-red-500/30'
            }`}
          >
            {badgeLabel || (badgeStatus === 'valide' ? 'Adhésion active' : badgeStatus === 'grace' ? 'Période de grâce' : 'Carte invalide')}
          </span>
        </div>

        {/* Card Body */}
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          {/* QR Code */}
          <div className="bg-white p-3 rounded-xl shadow-md shrink-0">
            <QRCodeSVG value={verifyUrl} size={130} level="M" includeMargin={false} />
          </div>

          {/* Member Details */}
          <div className="space-y-3 flex-1 text-center sm:text-left">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Membre</p>
              <h4 className="text-lg font-bold truncate">
                {prenom} {nom}
              </h4>
            </div>

            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Catégorie statutaire</p>
              <p className="text-sm font-medium capitalize flex items-center justify-center sm:justify-start gap-1">
                <ShieldCheck className="w-4 h-4 text-amber-500 inline" />
                {categorie}
              </p>
            </div>

            {date_expiration_adhesion && statut_adhesion === 'approuve' && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Expire le</p>
                <p className="text-xs font-medium text-slate-300 flex items-center justify-center sm:justify-start gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 inline" />
                  {new Date(date_expiration_adhesion).toLocaleDateString('fr-CA')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card Footer Info */}
        <div className="pt-4 border-t border-white/10 flex justify-between items-center text-[10px] text-slate-400">
          <span>Synergie UQO © {new Date().getFullYear()}</span>
          <span className="font-mono text-slate-500 truncate max-w-[150px]">{qr_token}</span>
        </div>
      </CardContent>
    </Card>
  );
}
