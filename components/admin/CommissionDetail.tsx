'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import CommissionForm from './CommissionForm';
import { addCommissionMember, removeCommissionMember, deleteCommission } from '@/app/actions/commission';

export default function CommissionDetail({ commission, commissionMembres, allMembers }: {
  commission: any;
  commissionMembres: any[];
  allMembers: any[];
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const filteredMembers = useMemo(() => {
    if (!searchTerm) return [];
    return allMembers.filter(m => 
      `${m.prenom} ${m.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !commissionMembres.some(cm => cm.profile?.id === m.id)
    ).slice(0, 5);
  }, [searchTerm, allMembers, commissionMembres]);

  const handleDelete = async () => {
    if (commission.est_systeme) {
      alert("Cette commission est une commission système statutaire et permanente de Synergie UQO. Elle ne peut pas être supprimée.");
      return;
    }
    if (confirm('Voulez-vous vraiment supprimer cette commission ?')) {
      try {
        await deleteCommission(commission.id);
        router.push('/admin/commissions');
      } catch (e) {
        console.error(e);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleAddMember = async () => {
    if (!selectedMemberId) return;
    setIsAddingMember(true);
    try {
      await addCommissionMember(commission.id, selectedMemberId, 'membre');
      setSearchTerm('');
      setSelectedMemberId('');
      router.refresh();
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l\'ajout du membre');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (confirm('Retirer ce membre de la commission ?')) {
      try {
        await removeCommissionMember(commission.id, memberId);
        router.refresh();
      } catch (e) {
        console.error(e);
        alert('Erreur lors de la suppression du membre');
      }
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/commissions" className="text-blue-600 hover:underline mb-4 inline-block">
        &larr; Retour aux commissions
      </Link>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{commission.nom}</h1>
          <Badge className="mt-2">{commission.statut || 'Actif'}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Annuler l\'édition' : 'Modifier'}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>Supprimer</Button>
        </div>
      </div>

      {isEditing ? (
        <Card>
          <CardHeader><CardTitle>Modifier la commission</CardTitle></CardHeader>
          <CardContent>
            <CommissionForm 
              members={allMembers} 
              commission={commission} 
              onSuccess={() => setIsEditing(false)} 
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Détails</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><strong>Description:</strong> <p className="mt-1">{commission.description || 'N/A'}</p></div>
            <div><strong>Objectifs:</strong> <p className="mt-1 whitespace-pre-wrap">{commission.objectifs || 'N/A'}</p></div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <strong>Responsable:</strong> 
                <span className="ml-2">
                  {commission.responsable ? `${commission.responsable.prenom} ${commission.responsable.nom}` : 'Non assigné'}
                </span>
              </div>
              <div>
                <strong>Date de création:</strong> 
                <span className="ml-2">
                  {new Date(commission.created_at).toLocaleDateString('fr-CA')}
                </span>
              </div>
              {commission.date_fin && (
                <div>
                  <strong>Date de fin prévue:</strong> 
                  <span className="ml-2">
                    {new Date(commission.date_fin).toLocaleDateString('fr-CA')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Membres de la commission ({commissionMembres.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="flex-1 relative">
              <label className="text-sm font-medium mb-1 block">Ajouter un membre</label>
              <Input 
                placeholder="Rechercher par nom..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && filteredMembers.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {filteredMembers.map(m => (
                    <div 
                      key={m.id} 
                      className="p-2 hover:bg-slate-100 cursor-pointer text-sm"
                      onClick={() => {
                        setSelectedMemberId(m.id);
                        setSearchTerm(`${m.prenom} ${m.nom}`);
                      }}
                    >
                      {m.prenom} {m.nom}
                    </div>
                  ))}
                </div>
              )}
              {searchTerm && filteredMembers.length === 0 && (
                <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 p-2 text-sm text-gray-500">
                  Aucun membre trouvé ou déjà dans la commission.
                </div>
              )}
            </div>
            <Button onClick={handleAddMember} disabled={!selectedMemberId || isAddingMember} className="w-full sm:w-auto">
              Ajouter à la commission
            </Button>
          </div>

          {commissionMembres.length === 0 ? (
            <p className="text-gray-500 text-center py-6 border rounded-md border-dashed">Aucun membre dans cette commission.</p>
          ) : (
            <div className="border rounded-md divide-y">
              {commissionMembres.map((cm) => (
                <div key={cm.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="font-medium">{cm.profile?.prenom} {cm.profile?.nom}</div>
                    <div className="text-sm text-gray-500">
                      {cm.profile?.email} {cm.profile?.poste_actuel ? `• ${cm.profile.poste_actuel}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{cm.role_commission || cm.role || 'Membre'}</Badge>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveMember(cm.profile?.id)}>
                      Retirer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
