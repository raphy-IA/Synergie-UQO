'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronRight, ArrowLeft, MessageSquare, Plus, Check } from 'lucide-react';

interface Category {
  id: string;
  nom: string;
  description: string;
}

interface Subject {
  id: string;
  titre: string;
  resolu: boolean;
  created_at: string;
  profiles: {
    prenom: string;
    nom: string;
  };
}

interface ForumMessage {
  id: string;
  message: string;
  created_at: string;
  profiles: {
    prenom: string;
    nom: string;
  };
}

export default function ForumPage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Navigation state: 'categories' | 'subjects' | 'messages'
  const [view, setView] = useState<'categories' | 'subjects' | 'messages'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [forumMessages, setForumMessages] = useState<ForumMessage[]>([]);

  // Form states
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  const [newSubjectFirstMsg, setNewSubjectFirstMsg] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showNewSubjectForm, setShowNewSubjectForm] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
    fetchCategories();
  }, [supabase]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('forum_categories').select('*').order('nom');
    if (data && data.length > 0) {
      setCategories(data);
    } else {
      // Seed default categories if empty
      const defaultCats = [
        { nom: 'Mentorat & Carrière', description: 'Échangez sur la recherche de stages, d&apos;emplois et le mentorat.' },
        { nom: 'Aide aux études', description: 'Entraide pour les cours, les devoirs et la vie à l&apos;UQO.' },
        { nom: 'Entrepreneuriat', description: 'Partagez vos projets de start-up et d&apos;innovation.' },
      ];
      await supabase.from('forum_categories').insert(defaultCats);
      const { data: refetched } = await supabase.from('forum_categories').select('*').order('nom');
      if (refetched) setCategories(refetched);
    }
  };

  const handleCategorySelect = async (cat: Category) => {
    setSelectedCategory(cat);
    setView('subjects');
    const { data } = await supabase
      .from('forum_sujets')
      .select(`
        id,
        titre,
        resolu,
        created_at,
        profiles (prenom, nom)
      `)
      .eq('categorie_id', cat.id)
      .order('created_at', { ascending: false });

    if (data) setSubjects(data as any);
  };

  const handleSubjectSelect = async (sub: Subject) => {
    setSelectedSubject(sub);
    setView('messages');
    const { data } = await supabase
      .from('forum_messages')
      .select(`
        id,
        message,
        created_at,
        profiles (prenom, nom)
      `)
      .eq('sujet_id', sub.id)
      .order('created_at', { ascending: true });

    if (data) setForumMessages(data as any);
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectTitle || !newSubjectFirstMsg || !currentUser || !selectedCategory) return;

    // 1. Create Subject
    const { data: subData, error: subErr } = await supabase
      .from('forum_sujets')
      .insert({
        categorie_id: selectedCategory.id,
        auteur_id: currentUser.id,
        titre: newSubjectTitle,
        resolu: false,
      })
      .select()
      .single();

    if (subErr || !subData) return;

    // 2. Create first message
    await supabase.from('forum_messages').insert({
      sujet_id: subData.id,
      auteur_id: currentUser.id,
      message: newSubjectFirstMsg,
    });

    setNewSubjectTitle('');
    setNewSubjectFirstMsg('');
    setShowNewSubjectForm(false);
    handleCategorySelect(selectedCategory);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !selectedSubject) return;

    const { error } = await supabase.from('forum_messages').insert({
      sujet_id: selectedSubject.id,
      auteur_id: currentUser.id,
      message: newMessage.trim(),
    });

    if (!error) {
      setNewMessage('');
      handleSubjectSelect(selectedSubject);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-500 absolute top-0 left-0 right-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {view !== 'categories' && (
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 shrink-0"
                onClick={() => {
                  if (view === 'messages') {
                    setView('subjects');
                    if (selectedCategory) handleCategorySelect(selectedCategory);
                  } else {
                    setView('categories');
                  }
                }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-50 text-blue-900 rounded-2xl">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Forums de Discussion</h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">
                Échangez entre étudiants, diplômés et mentors de Synergie UQO. Réseau d&apos;entraide et de partage.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW: CATEGORIES */}
      {view === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              onClick={() => handleCategorySelect(cat)}
              className="hover:shadow-xl cursor-pointer transition-all border border-slate-200/80 rounded-3xl bg-white flex flex-col justify-between overflow-hidden group hover:border-blue-900"
            >
              <CardHeader className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mb-3 group-hover:bg-blue-900 group-hover:text-white transition-colors">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg font-extrabold text-slate-900">{cat.nom}</CardTitle>
                <CardDescription className="text-slate-500 text-xs mt-1.5 leading-relaxed">{cat.description}</CardDescription>
              </CardHeader>
              <div className="p-6 pt-0 flex justify-end text-blue-900 font-extrabold items-center gap-1 text-xs">
                Parcourir les sujets <ChevronRight className="w-4 h-4" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* VIEW: SUBJECTS */}
      {view === 'subjects' && selectedCategory && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 border border-slate-200/80 shadow-md rounded-3xl gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full">Catégorie</span>
              <h3 className="font-extrabold text-xl text-slate-900 mt-1">{selectedCategory.nom}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{selectedCategory.description}</p>
            </div>
            <Button
              onClick={() => setShowNewSubjectForm(!showNewSubjectForm)}
              className="bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold gap-1.5 h-11 px-5 rounded-xl shadow-md shrink-0"
            >
              <Plus className="w-4 h-4" /> Ouvrir un nouveau sujet
            </Button>
          </div>

          {showNewSubjectForm && (
            <Card className="border border-slate-200/80 shadow-xl rounded-3xl bg-white p-6 sm:p-8">
              <form onSubmit={handleCreateSubject} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="font-bold text-xs uppercase tracking-wider text-slate-700">Titre du Sujet *</Label>
                  <Input
                    id="title"
                    required
                    value={newSubjectTitle}
                    onChange={(e) => setNewSubjectTitle(e.target.value)}
                    placeholder="Ex: Recherche de stage informatique / Recommandations de cours"
                    className="h-11 rounded-xl border-slate-200 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="firstMsg" className="font-bold text-xs uppercase tracking-wider text-slate-700">Message initial *</Label>
                  <textarea
                    id="firstMsg"
                    required
                    rows={4}
                    className="w-full p-4 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white text-xs font-medium"
                    value={newSubjectFirstMsg}
                    onChange={(e) => setNewSubjectFirstMsg(e.target.value)}
                    placeholder="Posez votre question ou amorcez la discussion..."
                  />
                </div>
                <Button type="submit" className="bg-blue-900 hover:bg-blue-950 text-white font-bold h-11 rounded-xl px-6">
                  Publier la discussion
                </Button>
              </form>
            </Card>
          )}

          {subjects.length === 0 ? (
            <div className="text-slate-400 text-center py-16 bg-white border border-slate-200/80 rounded-3xl text-xs italic">
              Aucun sujet dans cette catégorie. Soyez le premier membre à initier un échange !
            </div>
          ) : (
            <div className="space-y-3">
              {subjects.map((sub) => (
                <Card
                  key={sub.id}
                  onClick={() => handleSubjectSelect(sub)}
                  className="hover:shadow-md cursor-pointer border border-slate-200/80 rounded-2xl bg-white p-5 flex items-center justify-between transition-all hover:border-blue-900"
                >
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      {sub.titre}
                      {sub.resolu && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Résolu
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Par <strong>{sub.profiles.prenom} {sub.profiles.nom}</strong> • Le {new Date(sub.created_at).toLocaleDateString('fr-CA', { dateStyle: 'medium' })}
                    </p>
                  </div>
                  <MessageSquare className="w-5 h-5 text-blue-900 shrink-0" />
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: MESSAGES */}
      {view === 'messages' && selectedSubject && (
        <div className="space-y-6">
          <div className="bg-white p-6 border border-slate-200/80 shadow-md rounded-3xl">
            <h3 className="font-extrabold text-xl text-slate-900">{selectedSubject.titre}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Discussion initiée par <strong>{selectedSubject.profiles.prenom} {selectedSubject.profiles.nom}</strong> le {new Date(selectedSubject.created_at).toLocaleDateString('fr-CA', { dateStyle: 'long' })}
            </p>
          </div>

          <div className="space-y-4">
            {forumMessages.map((msg) => (
              <Card key={msg.id} className="border border-slate-200/80 rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
                  <span className="font-extrabold text-xs text-blue-900 uppercase tracking-wider">{msg.profiles.prenom} {msg.profiles.nom}</span>
                  <span className="text-[11px] text-slate-400 font-medium">{new Date(msg.created_at).toLocaleDateString('fr-CA')} à {new Date(msg.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{msg.message}</p>
              </Card>
            ))}
          </div>

          <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white p-6 sm:p-8">
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reply" className="font-bold text-xs uppercase tracking-wider text-slate-700">Votre message de réponse *</Label>
                <textarea
                  id="reply"
                  required
                  rows={4}
                  className="w-full p-4 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white text-xs font-medium"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Apportez une réponse constructive à la communauté..."
                />
              </div>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-950 text-white font-bold h-11 rounded-xl px-6">
                Envoyer la réponse
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
