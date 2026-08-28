'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createCommission, updateCommission } from '@/app/actions/commission';

export default function CommissionForm({ 
  members, 
  commission, 
  onSuccess 
}: { 
  members: any[]; 
  commission?: any; 
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!commission;

  const [nom, setNom] = useState(commission?.nom || '');
  const [description, setDescription] = useState(commission?.description || '');
  const [objectifs, setObjectifs] = useState(commission?.objectifs || '');
  const [dateFin, setDateFin] = useState(commission?.date_fin ? commission.date_fin.substring(0, 10) : '');
  const [responsableId, setResponsableId] = useState(commission?.responsable_id || 'none');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const data = {
        nom,
        description,
        objectifs,
        date_fin: dateFin || null,
        responsable_id: responsableId && responsableId !== 'none' ? responsableId : null
      };

      if (isEdit) {
        await updateCommission(commission.id, data);
      } else {
        await createCommission(data);
      }
      
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Nom de la commission</label>
        <Input required value={nom} onChange={(e) => setNom(e.target.value)} />
      </div>
      
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      
      <div>
        <label className="text-sm font-medium">Objectifs</label>
        <Textarea rows={3} value={objectifs} onChange={(e) => setObjectifs(e.target.value)} />
      </div>
      
      <div>
        <label className="text-sm font-medium">Responsable</label>
        <Select value={responsableId} onValueChange={setResponsableId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un membre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun</SelectItem>
            {members.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.prenom} {m.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">Date de fin (optionnel)</label>
        <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
      </div>
      
      <div className="pt-4 flex gap-2 justify-end">
        {onSuccess && (
          <Button type="button" variant="outline" onClick={onSuccess}>Annuler</Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
}
