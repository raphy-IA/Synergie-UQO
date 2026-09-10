'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Download, Share2, Check, UserPlus } from 'lucide-react';

export default function ShareAdhesionCard() {
  const [adhesionUrl, setAdhesionUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAdhesionUrl(`${window.location.origin}/adhesion`);
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        setHasNativeShare(true);
      }
    }
  }, []);

  const handleCopy = async () => {
    if (!adhesionUrl) return;
    try {
      await navigator.clipboard.writeText(adhesionUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Erreur lors de la copie du lien :', err);
    }
  };

  const handleNativeShare = async () => {
    if (!adhesionUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rejoindre le CEDP - UQO',
          text: 'Adhérez au Cercle des étudiants diplômés et professionnels de l’UQO !',
          url: adhesionUrl,
        });
      } catch (err) {
        console.log('Partage annulé');
      }
    } else {
      handleCopy();
    }
  };

  const handleDownloadQR = () => {
    const svgElement = document.getElementById('adhesion-qr-code-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const padding = 30;
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2 + 50;

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, padding, padding);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CEDP - UQO | Formulaire d\'adhésion', canvas.width / 2, canvas.height - 25);
        
        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.fillText('Scannez pour rejoindre la communauté', canvas.width / 2, canvas.height - 10);

        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngFile;
        downloadLink.download = 'QR_Adhesion_CEDP_UQO.png';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Card className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      {/* Hidden QR Code element for PNG generation */}
      <div className="hidden" aria-hidden="true">
        <QRCodeSVG
          id="adhesion-qr-code-svg"
          value={adhesionUrl || 'https://cedp-uqo.ca/adhesion'}
          size={200}
          level="M"
          includeMargin={false}
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center shrink-0">
          <UserPlus className="w-5 h-5 text-blue-900" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Inviter / Partager le lien d&apos;adhésion</h3>
          <p className="text-xs text-slate-500">Partagez ce lien pour inviter des diplômés et étudiants à devenir membres du CEDP - UQO.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
        <div className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-mono text-slate-700 overflow-hidden">
          <span className="truncate">{adhesionUrl || 'Chargement du lien...'}</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={handleCopy}
            className={`h-9 text-xs font-bold gap-1.5 rounded-xl transition-colors ${
              copied
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-blue-950 hover:bg-blue-900 text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> Copié !
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copier le lien
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadQR}
            title="Télécharger le QR Code"
            className="h-9 text-xs font-semibold gap-1.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" /> Télécharger QR Code
          </Button>

          {hasNativeShare && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNativeShare}
              title="Partager"
              className="h-9 text-xs font-semibold gap-1.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-600" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
