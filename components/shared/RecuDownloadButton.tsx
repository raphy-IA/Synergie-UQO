'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface RecuDownloadButtonProps {
  transactionId: string;
  montant: number | string;
  dateStr: string;
}

export default function RecuDownloadButton({ transactionId, montant, dateStr }: RecuDownloadButtonProps) {
  const handlePrint = () => {
    const formattedDate = new Date(dateStr).toLocaleDateString('fr-CA', { dateStyle: 'full' });
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reçu de Cotisation - Synergie UQO</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #0f172a; }
            .header { border-bottom: 3px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 24px; font-weight: 900; color: #1e3a8a; }
            .badge { background: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 12px; }
            .box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; margin-bottom: 30px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
            .label { color: #64748b; font-weight: bold; }
            .val { font-weight: bold; color: #0f172a; }
            .total { font-size: 28px; font-weight: 900; color: #1e3a8a; text-align: right; margin-top: 20px; border-top: 2px border-dashed #cbd5e1; padding-top: 15px; }
            .footer { margin-top: 50px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">SYNERGIE UQO</div>
            <div class="badge">REÇU OFFICIEL DE PAIEMENT</div>
          </div>

          <div class="box">
            <div class="row"><span class="label">N° de Transaction :</span> <span class="val">${transactionId}</span></div>
            <div class="row"><span class="label">Date d'émission :</span> <span class="val">${formattedDate}</span></div>
            <div class="row"><span class="label">Objet :</span> <span class="val">Cotisation Annuelle Régulière d'Adhésion</span></div>
            <div class="row"><span class="label">Statut du règlement :</span> <span class="val" style="color: #166534;">Payé - Confirmé</span></div>
            
            <div class="total">
              ${Number(montant).toFixed(2)} CAD
            </div>
          </div>

          <p style="font-size: 13px; line-height: 1.6; color: #475569;">
            Ce document atteste du paiement intégral de la cotisation de membre au sein de l'association Synergie UQO pour la période en cours.
          </p>

          <div class="footer">
            Synergie UQO - Université du Québec en Outaouais<br/>
            Document généré automatiquement à titre de pièce justificative officielle.
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 text-blue-900 font-bold border-blue-200 hover:bg-blue-50 rounded-xl h-9"
      onClick={handlePrint}
    >
      <FileText className="w-4 h-4 text-blue-900" /> Reçu PDF
    </Button>
  );
}
