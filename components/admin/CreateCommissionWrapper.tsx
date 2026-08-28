'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import CommissionForm from './CommissionForm';

export default function CreateCommissionWrapper({ members }: { members: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (isOpen) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-bold">Créer une commission</h2>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-900 text-2xl leading-none">&times;</button>
          </div>
          <CommissionForm members={members} onSuccess={() => setIsOpen(false)} />
        </div>
      </div>
    );
  }
  
  return <Button onClick={() => setIsOpen(true)}>Créer une commission</Button>;
}
