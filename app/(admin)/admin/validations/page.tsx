import React from 'react';
import ValidationCenter from '@/components/admin/ValidationCenter';

export const dynamic = 'force-dynamic';

export default function AdminValidationsPage() {
  return (
    <div className="max-w-7xl mx-auto py-4">
      <ValidationCenter />
    </div>
  );
}
