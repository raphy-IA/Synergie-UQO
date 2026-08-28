'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, User, Eye } from 'lucide-react';

interface Member {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  role: string;
  categorie: string;
  statut_adhesion: string;
  programme_etudes: string | null;
  matricule_uqo: string | null;
  created_at: string;
}

interface MemberListProps {
  initialMembers: Member[];
}

export default function MemberList({ initialMembers }: MemberListProps) {
  const [search, setSearch] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('all');
  const [filterStatut, setFilterStatut] = useState('all');

  const filteredMembers = initialMembers.filter((m) => {
    const matchesSearch =
      `${m.prenom} ${m.nom}`.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());

    const matchesCategorie = filterCategorie === 'all' || m.categorie === filterCategorie;
    const matchesStatut = filterStatut === 'all' || m.statut_adhesion === filterStatut;

    return matchesSearch && matchesCategorie && matchesStatut;
  });

  const handleExportCSV = () => {
    const headers = [
      'Prénom',
      'Nom',
      'Email',
      'Téléphone',
      'Rôle',
      'Catégorie',
      'Statut Adhésion',
      'Programme d\'études',
      'Matricule UQO',
      'Date Inscription',
    ];

    const rows = filteredMembers.map((m) => [
      m.prenom,
      m.nom,
      m.email,
      m.telephone || '',
      m.role,
      m.categorie,
      m.statut_adhesion,
      m.programme_etudes || '',
      m.matricule_uqo || '',
      new Date(m.created_at).toLocaleDateString('fr-CA'),
    ]);

    // Use BOM for Excel compatibility with accents
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `membres_synergie_uqo_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 w-full sm:w-auto gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </div>

        <div className="flex flex-wrap w-full sm:w-auto gap-2 justify-end">
          <Select value={filterCategorie} onValueChange={(val) => setFilterCategorie(val || 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              <SelectItem value="etudiant">Étudiant</SelectItem>
              <SelectItem value="diplome">Diplômé</SelectItem>
              <SelectItem value="ancien">Ancien étudiant</SelectItem>
              <SelectItem value="associe">Associé</SelectItem>
              <SelectItem value="honneur">Honneur</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatut} onValueChange={(val) => setFilterStatut(val || 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="en_attente_paiement">En attente paiement</SelectItem>
              <SelectItem value="en_attente_approbation">En attente approb.</SelectItem>
              <SelectItem value="approuve">Approuvé</SelectItem>
              <SelectItem value="rejete">Rejeté</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Courriel</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date Adhésion</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center p-8 text-slate-500">
                  Aucun membre ne correspond à vos critères de recherche.
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-semibold text-slate-950">
                    {m.prenom} {m.nom}
                  </TableCell>
                  <TableCell className="capitalize text-slate-700">{m.categorie}</TableCell>
                  <TableCell className="text-slate-600">{m.email}</TableCell>
                  <TableCell className="text-slate-600 capitalize">{m.role.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        m.statut_adhesion === 'approuve'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.statut_adhesion === 'en_attente_approbation'
                          ? 'bg-amber-100 text-amber-800'
                          : m.statut_adhesion === 'en_attente_paiement'
                          ? 'bg-slate-100 text-slate-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {m.statut_adhesion === 'approuve'
                        ? 'Approuvé'
                        : m.statut_adhesion === 'en_attente_approbation'
                        ? 'En attente CA'
                        : m.statut_adhesion === 'en_attente_paiement'
                        ? 'Attente paiement'
                        : 'Rejeté'}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {new Date(m.created_at).toLocaleDateString('fr-CA')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/membres/${m.id}`}
                      className={buttonVariants({ size: "xs", variant: "outline", className: "gap-1" })}
                    >
                      <Eye className="w-3.5 h-3.5" /> Gérer
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
