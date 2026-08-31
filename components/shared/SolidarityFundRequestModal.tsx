'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { HeartHandshake, Upload } from 'lucide-react';
import { submitSolidarityFundClaim } from '@/app/actions/finances';
import { createClient } from '@/lib/supabase/client';

export default function SolidarityFundRequestModal() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [montant, setMontant] = useState('');
  const [motif, setMotif] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valMontant = parseFloat(montant);
    if (!valMontant || valMontant <= 0 || !motif) {
      alert("Veuillez renseigner le montant souhaité et le motif de votre demande d'aide.");
      return;
    }

    setSubmitting(true);
    let justificatifUrl = '';

    if (file) {
      const fileName = `aides/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (!error && data) {
        const { data: pubUrl } = supabase.storage.from('documents').getPublicUrl(fileName);
        justificatifUrl = pubUrl.publicUrl;
      }
    }

    const res = await submitSolidarityFundClaim({
      montant_demande: valMontant,
      motif,
      justificatif_url: justificatifUrl || undefined,
    });

    setSubmitting(false);

    if (res.success) {
      alert("Votre demande d'aide d'urgence a bien été transmise au Conseil d'Administration. Elle sera examinée dans les meilleurs délais.");
      setOpen(false);
      setMontant('');
      setMotif('');
      setFile(null);
    } else {
      alert(res.error || "Erreur lors de la soumission de votre demande d'aide.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="bg-purple-900 hover:bg-purple-950 text-white font-extrabold rounded-xl px-5 h-11 shadow-md gap-2" />}>
        <HeartHandshake className="w-5 h-5 text-amber-400" /> Solliciter le Fonds de Solidarité
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white rounded-3xl p-6 space-y-4">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <HeartHandshake className="w-6 h-6 text-purple-600" /> Demande d&apos;Aide d&apos;Urgence
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Synergie UQO accompagne ses membres traversant des difficultés ponctuelles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="montantAide" className="font-bold text-xs uppercase tracking-wider text-slate-700 block">Montant souhaité ($ CAD) *</Label>
              <Input
                id="montantAide"
                type="number"
                step="25"
                required
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="Ex: 250.00"
                className="h-11 rounded-xl border-slate-200 font-extrabold text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="motifAide" className="font-bold text-xs uppercase tracking-wider text-slate-700 block">Description de la situation d&apos;urgence *</Label>
              <Textarea
                id="motifAide"
                rows={4}
                required
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Explication confidentielle de la situation nécessitant un soutien..."
                className="rounded-xl text-xs border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="justificatifFile" className="font-bold text-xs uppercase tracking-wider text-slate-700 block">Document justificatif (PDF ou Image, Optionnel)</Label>
              <Input
                id="justificatifFile"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="h-11 rounded-xl border-slate-200 text-xs pt-2"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="font-bold rounded-xl text-xs">
              Annuler
            </Button>
            <Button type="submit" disabled={submitting} className="bg-purple-900 hover:bg-purple-950 text-white font-extrabold rounded-xl px-5 text-xs h-10">
              {submitting ? 'Envoi en cours...' : 'Soumettre la demande'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
