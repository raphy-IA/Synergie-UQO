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
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleCategorieChange = (val: string) => {
    setFilterCategorie(val);
    setCurrentPage(1);
  };

  const handleStatutChange = (val: string) => {
    setFilterStatut(val);
    setCurrentPage(1);
  };

  const filteredMembers = initialMembers.filter((m) => {
    const matchesSearch =
      `${m.prenom} ${m.nom}`.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());

    const matchesCategorie = filterCategorie === 'all' || m.categorie === filterCategorie;
    const matchesStatut = filterStatut === 'all' || m.statut_adhesion === filterStatut;

    return matchesSearch && matchesCategorie && matchesStatut;
  });

  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE) || 1;
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
    link.setAttribute('download', `membres_cedp_uqo_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStatusBadge = (statut: string) => {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
          statut === 'approuve'
            ? 'bg-emerald-100 text-emerald-800'
            : statut === 'en_attente_approbation'
            ? 'bg-amber-100 text-amber-800'
            : statut === 'en_attente_paiement'
            ? 'bg-slate-100 text-slate-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {statut === 'approuve'
          ? 'Approuvé'
          : statut === 'en_attente_approbation'
          ? 'En attente CA'
          : statut === 'en_attente_paiement'
          ? 'Attente paiement'
          : 'Rejeté'}
      </span>
    );
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
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </div>

        <div className="flex flex-wrap w-full sm:w-auto gap-2 justify-end">
          <Select value={filterCategorie} onValueChange={(val) => handleCategorieChange(val || 'all')}>
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

          <Select value={filterStatut} onValueChange={(val) => handleStatutChange(val || 'all')}>
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

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {paginatedMembers.length === 0 ? (
          <div className="bg-white rounded-xl border p-6 text-center text-slate-500 text-sm">
            Aucun membre ne correspond à vos critères de recherche.
          </div>
        ) : (
          paginatedMembers.map((m) => (
            <div key={m.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{m.prenom} {m.nom}</h3>
                  <p className="text-xs text-slate-500">{m.email}</p>
                </div>
                {renderStatusBadge(m.statut_adhesion)}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Catégorie</span>
                  <span className="capitalize font-semibold text-slate-800">{m.categorie}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Rôle</span>
                  <span className="capitalize text-slate-700">{m.role.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Date Adhésion</span>
                  <span>{new Date(m.created_at).toLocaleDateString('fr-CA')}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  href={`/admin/membres/${m.id}`}
                  className={buttonVariants({ size: "sm", variant: "outline", className: "w-full justify-center gap-1.5 font-semibold text-xs text-blue-900 border-blue-200 bg-blue-50/50" })}
                >
                  <Eye className="w-4 h-4" /> Gérer le profil
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Directory Table (Desktop) */}
      <div className="hidden md:block bg-white rounded-lg border shadow-sm overflow-x-auto">
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
            {paginatedMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center p-8 text-slate-500">
                  Aucun membre ne correspond à vos critères de recherche.
                </TableCell>
              </TableRow>
            ) : (
              paginatedMembers.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-semibold text-slate-950">
                    {m.prenom} {m.nom}
                  </TableCell>
                  <TableCell className="capitalize text-slate-700">{m.categorie}</TableCell>
                  <TableCell className="text-slate-600">{m.email}</TableCell>
                  <TableCell className="text-slate-600 capitalize">{m.role.replace('_', ' ')}</TableCell>
                  <TableCell>{renderStatusBadge(m.statut_adhesion)}</TableCell>
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 bg-white p-3 rounded-lg border text-xs text-slate-600">
          <div>
            Affichage de <span className="font-semibold text-slate-900">{Math.min(filteredMembers.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> à <span className="font-semibold text-slate-900">{Math.min(filteredMembers.length, currentPage * ITEMS_PER_PAGE)}</span> sur <span className="font-semibold text-slate-900">{filteredMembers.length}</span> membres
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 text-xs font-medium"
            >
              Précédent
            </Button>
            <span className="text-xs font-semibold px-2">
              Page {currentPage} sur {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 text-xs font-medium"
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
