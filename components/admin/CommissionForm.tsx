'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createCommission, updateCommission } from '@/app/actions/commission';
import { getCommissionMissions } from '@/app/actions/commissions-workspace';
import { Plus, Trash2, ListTodo } from 'lucide-react';

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

  // Missions list state
  const [missions, setMissions] = useState<{ id?: string; numero_mission?: number; titre: string; description?: string }[]>([]);

  useEffect(() => {
    if (commission?.id) {
      getCommissionMissions(commission.id).then(res => {
        if (res.success && res.missions) {
          setMissions(res.missions.map(m => ({
            id: m.id,
            numero_mission: m.numero_mission,
            titre: m.titre,
            description: m.description || ''
          })));
        }
      });
    }
  }, [commission?.id]);

  const handleAddMissionInput = () => {
    setMissions([...missions, { numero_mission: missions.length + 1, titre: '', description: '' }]);
  };

  const handleMissionChange = (index: number, field: 'titre' | 'description', value: string) => {
    const updated = [...missions];
    updated[index][field] = value;
    setMissions(updated);
  };

  const handleRemoveMissionInput = (index: number) => {
    setMissions(missions.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const data = {
        nom,
        description,
        objectifs,
        date_fin: dateFin || null,
        responsable_id: responsableId && responsableId !== 'none' ? responsableId : null,
        missions: missions.filter(m => m.titre.trim().length > 0)
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
      alert('Erreur lors de l\'enregistrement de la commission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">Nom de la commission *</label>
        <Input required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Commission Culture & Événements" className="h-10 rounded-xl" />
      </div>
      
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">Description globale</label>
        <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Rôle global et responsabilités..." className="rounded-xl text-xs" />
      </div>
      
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">Objectifs globaux</label>
        <Textarea rows={2} value={objectifs} onChange={(e) => setObjectifs(e.target.value)} placeholder="Synthèse des objectifs globaux..." className="rounded-xl text-xs" />
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">Responsable Principal</label>
        <Select value={responsableId} onValueChange={setResponsableId}>
          <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
            <SelectValue placeholder="Sélectionner un responsable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun (À désigner plus tard)</SelectItem>
            {members.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.prenom} {m.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">Date d'échéance / Fin (optionnel)</label>
        <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="h-10 rounded-xl" />
      </div>

      {/* Configuration & Saisie des Missions */}
      <div className="space-y-3 pt-3 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <label className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <ListTodo className="w-4 h-4 text-blue-950" />
            Missions de la Commission ({missions.length})
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddMissionInput}
            className="h-8 text-xs font-bold rounded-xl gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter une Mission
          </Button>
        </div>

        {missions.length === 0 ? (
          <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
            Aucune mission spécifique ajoutée. Cliquez sur « Ajouter une Mission » ci-dessus.
          </p>
        ) : (
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {missions.map((m, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 relative group">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-950 px-2.5 py-0.5 rounded-full">
                    Mission #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMissionInput(idx)}
                    className="text-slate-400 hover:text-red-600 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Input
                  required
                  placeholder="Titre de la mission (Ex: Organiser les séances d'accueil...)"
                  value={m.titre}
                  onChange={(e) => handleMissionChange(idx, 'titre', e.target.value)}
                  className="h-9 text-xs font-bold rounded-lg bg-white"
                />
                <Input
                  placeholder="Description / Détails de la mission (Optionnel)"
                  value={m.description || ''}
                  onChange={(e) => handleMissionChange(idx, 'description', e.target.value)}
                  className="h-8 text-xs rounded-lg bg-white"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 flex gap-2 justify-end border-t border-slate-200">
        {onSuccess && (
          <Button type="button" variant="outline" onClick={onSuccess} className="rounded-xl text-xs font-bold">Annuler</Button>
        )}
        <Button type="submit" disabled={isSubmitting} className="bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-xs h-10 px-5 rounded-xl">
          {isSubmitting ? 'Enregistrement...' : isEdit ? 'Mettre à jour la Commission' : 'Créer la Commission'}
        </Button>
      </div>
    </form>
  );
}
