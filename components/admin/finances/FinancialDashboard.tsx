'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, ArrowUpRight, ArrowDownRight, HeartHandshake, Vault, Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import { updateFondCaisseInitial } from '@/app/actions/finances';

interface FinancialDashboardProps {
  summary: {
    fondInitial: number;
    totalRevenus: number;
    totalDepenses: number;
    totalAides: number;
    soldeTresorerie: number;
    nombrePaiements: number;
    nombreDepenses: number;
    nombreAides: number;
  };
  onRefresh: () => void;
}

export default function FinancialDashboard({ summary, onRefresh }: FinancialDashboardProps) {
  const [fondEdit, setFondEdit] = useState(summary.fondInitial.toString());
  const [isEditingFond, setIsEditingFond] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveFondInitial = async () => {
    const val = parseFloat(fondEdit);
    if (isNaN(val) || val < 0) return;
    setSaving(true);
    const res = await updateFondCaisseInitial(val);
    setSaving(false);
    if (res.success) {
      setIsEditingFond(false);
      onRefresh();
    } else {
      alert("Erreur lors de la mise à jour du fond de caisse.");
    }
  };

  const handleExportReport = () => {
    const reportData = `BILAN ET ÉTAT FINANCIER DE SYNERGIE UQO
Généré le : ${new Date().toLocaleDateString('fr-CA')}

1. Fond de caisse initial : ${summary.fondInitial.toFixed(2)} $ CAD
2. Total Revenus Encassés (Recettes) : ${summary.totalRevenus.toFixed(2)} $ CAD (${summary.nombrePaiements} transaction(s))
3. Total Dépenses Engagées (Notes de frais) : ${summary.totalDepenses.toFixed(2)} $ CAD (${summary.nombreDepenses} dépense(s))
4. Total Aides de Solidarité Versées : ${summary.totalAides.toFixed(2)} $ CAD (${summary.nombreAides} aide(s))
--------------------------------------------------
SOLDE NET DE TRÉSORERIE : ${summary.soldeTresorerie.toFixed(2)} $ CAD
`;

    const blob = new Blob([reportData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bilan_Financier_Synergie_UQO_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
  };

  return (
    <div className="space-y-8">
      
      {/* 4 Cartes KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Solde de Trésorerie Net */}
        <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-gradient-to-br from-blue-900 to-blue-950 text-white overflow-hidden p-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-extrabold text-amber-400 uppercase tracking-wider">
            <span>Solde de Trésorerie</span>
            <Vault className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-black tracking-tight">
            {summary.soldeTresorerie.toFixed(2)} $ CAD
          </div>
          <p className="text-[11px] text-blue-200 font-medium">
            (Fond initial + Recettes - Dépenses - Aides)
          </p>
        </Card>

        {/* Total Recettes / Revenus */}
        <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-extrabold text-emerald-700 uppercase tracking-wider">
            <span>Revenus & Recettes</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            +{summary.totalRevenus.toFixed(2)} $
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {summary.nombrePaiements} cotisations & versements
          </p>
        </Card>

        {/* Total Dépenses Engagées */}
        <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-extrabold text-red-700 uppercase tracking-wider">
            <span>Dépenses & Frais</span>
            <div className="p-2 rounded-xl bg-red-50 text-red-600">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            -{summary.totalDepenses.toFixed(2)} $
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {summary.nombreDepenses} note(s) de frais validée(s)
          </p>
        </Card>

        {/* Total Aides de Solidarité */}
        <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-extrabold text-purple-700 uppercase tracking-wider">
            <span>Fonds de Solidarité</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            -{summary.totalAides.toFixed(2)} $
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {summary.nombreAides} secours d&apos;urgence accordé(s)
          </p>
        </Card>

      </div>

      {/* Fond de Caisse Initial & Exportation */}
      <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">Configuration du Fond de Caisse Initial</h3>
            <p className="text-xs text-slate-500">Ajustez le solde d&apos;ouverture au démarrage de l&apos;exercice comptable.</p>
          </div>
          <Button onClick={handleExportReport} variant="outline" className="font-bold text-xs gap-2 rounded-xl border-slate-200">
            <Download className="w-4 h-4 text-blue-900" /> Exporter le Bilan Financier
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {isEditingFond ? (
            <div className="flex items-center gap-2 max-w-sm">
              <Input
                type="number"
                step="50"
                value={fondEdit}
                onChange={(e) => setFondEdit(e.target.value)}
                className="h-10 rounded-xl font-bold border-slate-200 text-xs"
              />
              <Button onClick={handleSaveFondInitial} disabled={saving} className="bg-blue-900 text-white font-bold text-xs h-10 rounded-xl px-4">
                {saving ? 'Enregistrement...' : 'Valider'}
              </Button>
              <Button onClick={() => setIsEditingFond(false)} variant="ghost" className="text-xs font-bold rounded-xl">
                Annuler
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-700">Fond de caisse initial :</span>
              <span className="text-base font-black text-blue-950 bg-slate-100 px-3 py-1 rounded-xl">
                {summary.fondInitial.toFixed(2)} $ CAD
              </span>
              <Button onClick={() => setIsEditingFond(true)} variant="ghost" className="text-xs font-bold text-blue-900 hover:underline">
                Modifier
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
