'use client';

import React, { useEffect, useState } from 'react';
import FinancialDashboard from '@/components/admin/finances/FinancialDashboard';
import RevenueManager from '@/components/admin/finances/RevenueManager';
import DepensesManager from '@/components/admin/DepensesManager';
import SolidarityFundManager from '@/components/admin/finances/SolidarityFundManager';
import AccountingLedger from '@/components/admin/finances/AccountingLedger';
import { Vault, ArrowUpRight, DollarSign, HeartHandshake, FileSpreadsheet } from 'lucide-react';
import { getFinancialSummary } from '@/app/actions/finances';

export default function AdminFinancesPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'revenus' | 'depenses' | 'aides' | 'ledger'>('dashboard');
  const [summary, setSummary] = useState<any>({
    fondInitial: 0,
    totalRevenus: 0,
    totalDepenses: 0,
    totalAides: 0,
    soldeTresorerie: 0,
    nombrePaiements: 0,
    nombreDepenses: 0,
    nombreAides: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    const data = await getFinancialSummary();
    setSummary(data);
    setLoading(false);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      
      {/* BARRE D'ONGLETS STYLISÉE ET PLEINE LARGEUR */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl flex flex-wrap gap-2 border border-slate-200/80 shadow-sm w-full">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'dashboard'
              ? 'bg-white text-blue-950 shadow-md border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Vault className="w-4 h-4 text-blue-900" /> Bilan Financier
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('revenus')}
          className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'revenus'
              ? 'bg-white text-blue-950 shadow-md border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-emerald-600" /> Revenus & Cotisations
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('depenses')}
          className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'depenses'
              ? 'bg-white text-blue-950 shadow-md border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <DollarSign className="w-4 h-4 text-red-600" /> Notes de Frais
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('aides')}
          className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'aides'
              ? 'bg-white text-blue-950 shadow-md border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <HeartHandshake className="w-4 h-4 text-purple-600" /> Fonds de Solidarité
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'ledger'
              ? 'bg-white text-blue-950 shadow-md border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-blue-900" /> Journal Comptable
        </button>
      </div>

      {/* CONTENU SELON L'ONGLET SÉLECTIONNÉ */}
      {activeTab === 'dashboard' && (
        <FinancialDashboard summary={summary} onRefresh={fetchSummary} />
      )}

      {activeTab === 'revenus' && (
        <RevenueManager />
      )}

      {activeTab === 'depenses' && (
        <DepensesManager />
      )}

      {activeTab === 'aides' && (
        <SolidarityFundManager />
      )}

      {activeTab === 'ledger' && (
        <AccountingLedger />
      )}

    </div>
  );
}
