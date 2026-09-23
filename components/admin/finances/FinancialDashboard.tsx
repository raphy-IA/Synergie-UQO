'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, ArrowUpRight, ArrowDownRight, HeartHandshake, Vault, Download, Clock, PieChart, ShieldAlert } from 'lucide-react';
import { updateFondCaisseInitial } from '@/app/actions/finances';

interface FinancialDashboardProps {
  summary: {
    fondInitial: number;
    totalRevenus: number;
    totalDepenses: number;
    totalAides: number;
    totalDepensesEnAttente?: number;
    soldeTresorerie: number;
    nombrePaiements: number;
    nombreDepenses: number;
    nombreAides: number;
    revenusParCategorie?: Record<string, number>;
    depensesParCategorie?: Record<string, number>;
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
    const reportData = `BILAN ET ÉTAT FINANCIER DU CEDP - SYNERGIE UQO
Généré le : ${new Date().toLocaleDateString('fr-CA')} à ${new Date().toLocaleTimeString('fr-CA')}

1. FOND DE CAISSE INITIAL : ${summary.fondInitial.toFixed(2)} $ CAD
2. RECETTES TOTALES ENCAISSÉES : ${summary.totalRevenus.toFixed(2)} $ CAD (${summary.nombrePaiements} versement(s))
3. DÉPENSES TOTALES PAYÉES : ${summary.totalDepenses.toFixed(2)} $ CAD (${summary.nombreDepenses} note(s) de frais)
4. AIDES DE SOLIDARITÉ VERSÉES : ${summary.totalAides.toFixed(2)} $ CAD (${summary.nombreAides} aide(s))
----------------------------------------------------------------------
SOLDE NET DE TRÉSORERIE DISPONIBLE : ${summary.soldeTresorerie.toFixed(2)} $ CAD
ENGAGEMENTS EN ATTENTE DE VALIDATION : ${(summary.totalDepensesEnAttente || 0).toFixed(2)} $ CAD
`;

    const blob = new Blob([reportData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bilan_Financier_Synergie_UQO_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
  };

  const totalRevenus = summary.totalRevenus || 0;
  const revenusCats = summary.revenusParCategorie || {};
  const depensesCats = summary.depensesParCategorie || {};

  return (
    <div className="space-y-8">
      
      {/* 4 Cartes KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Solde de Trésorerie Net */}
        <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-gradient-to-br from-blue-900 to-blue-950 text-white overflow-hidden p-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-extrabold text-amber-400 uppercase tracking-wider">
            <span>Solde de Trésorerie Net</span>
            <Vault className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-black tracking-tight">
            {summary.soldeTresorerie.toFixed(2)} $ CAD
          </div>
          <p className="text-[11px] text-blue-200 font-medium">
            Fond initial + Recettes - Dépenses - Aides
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
            {summary.nombrePaiements} versement(s) encaissé(s)
          </p>
        </Card>

        {/* Total Dépenses Engagées */}
        <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-extrabold text-red-700 uppercase tracking-wider">
            <span>Dépenses & Remboursements</span>
            <div className="p-2 rounded-xl bg-red-50 text-red-600">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            -{summary.totalDepenses.toFixed(2)} $
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {summary.nombreDepenses} note(s) de frais réglée(s)
          </p>
        </Card>

        {/* Engagements en Attente */}
        <Card className="border border-slate-200/80 shadow-md rounded-3xl bg-white p-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-extrabold text-amber-600 uppercase tracking-wider">
            <span>Dépenses en Attente</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {(summary.totalDepensesEnAttente || 0).toFixed(2)} $
          </div>
          <p className="text-xs text-slate-500 font-medium">
            En cours de validation N1/N2
          </p>
        </Card>

      </div>

      {/* VENTILATION DES REVENUS ET DÉPENSES PAR CATÉGORIE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recettes par Catégorie */}
        <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-600" /> Ventilation des Entrées Financières
            </h3>
            <span className="text-xs font-bold text-slate-400">Par Catégorie</span>
          </div>

          <div className="space-y-3">
            {Object.keys(revenusCats).length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">Aucun versement enregistré pour le moment.</p>
            ) : (
              Object.entries(revenusCats).map(([catKey, montant]) => {
                const percentage = totalRevenus > 0 ? Math.round((montant / totalRevenus) * 100) : 0;
                return (
                  <div key={catKey} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800 uppercase tracking-wide">{catKey.replace('_', ' ')}</span>
                      <span className="text-emerald-700 font-black">+{montant.toFixed(2)} $ ({percentage}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Dépenses par Catégorie */}
        <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <PieChart className="w-5 h-5 text-red-600" /> Ventilation des Dépenses Réglées
            </h3>
            <span className="text-xs font-bold text-slate-400">Par Poste</span>
          </div>

          <div className="space-y-3">
            {Object.keys(depensesCats).length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">Aucune dépense réglée pour le moment.</p>
            ) : (
              Object.entries(depensesCats).map(([catKey, montant]) => {
                const totalDep = summary.totalDepenses || 1;
                const percentage = Math.round((montant / totalDep) * 100);
                return (
                  <div key={catKey} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800 uppercase tracking-wide">{catKey.replace('_', ' ')}</span>
                      <span className="text-red-700 font-black">-{montant.toFixed(2)} $ ({percentage}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
