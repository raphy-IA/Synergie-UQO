import React from 'react';
import DepensesManager from '@/components/admin/DepensesManager';

export const dynamic = 'force-dynamic';

export default function AdminFinancesPage() {
  return (
    <div className="max-w-7xl mx-auto py-4">
      <DepensesManager />
    </div>
  );
}
