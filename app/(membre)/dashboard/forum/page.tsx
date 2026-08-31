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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {view !== 'categories' && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              if (view === 'messages') {
                setView('subjects');
                if (selectedCategory) handleCategorySelect(selectedCategory);
              } else {
                setView('categories');
              }
            }}
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
        )}
        <h1 className="text-3xl font-extrabold text-blue-950">Forums de Discussion</h1>
      </div>

      {/* VIEW: CATEGORIES */}
      {view === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              onClick={() => handleCategorySelect(cat)}
              className="hover:shadow-md cursor-pointer transition-all border border-slate-100 rounded-2xl bg-white flex flex-col justify-between"
            >
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-900">{cat.nom}</CardTitle>
                <CardDescription className="text-slate-500 text-sm mt-1">{cat.description}</CardDescription>
              </CardHeader>
              <div className="p-6 pt-0 flex justify-end text-blue-900 font-bold items-center gap-1 text-xs">
                Accéder <ChevronRight className="w-4 h-4" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* VIEW: SUBJECTS */}
      {view === 'subjects' && selectedCategory && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-50/50 p-4 border rounded-xl">
            <div>
              <h3 className="font-bold text-slate-900">{selectedCategory.nom}</h3>
              <p className="text-xs text-slate-500">{selectedCategory.description}</p>
            </div>
            <Button
              onClick={() => setShowNewSubjectForm(!showNewSubjectForm)}
              className="bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold gap-1.5"
            >
              <Plus className="w-4 h-4" /> Nouveau Sujet
            </Button>
          </div>

          {showNewSubjectForm && (
            <Card className="border border-slate-100 shadow-md rounded-2xl bg-white p-6">
              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre du Sujet</Label>
                  <Input id="title" required value={newSubjectTitle} onChange={(e) => setNewSubjectTitle(e.target.value)} placeholder="Ex: Recherche de stage informatique 2027" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstMsg">Message</Label>
                  <textarea
                    id="firstMsg"
                    required
                    rows={4}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white text-sm"
                    value={newSubjectFirstMsg}
                    onChange={(e) => setNewSubjectFirstMsg(e.target.value)}
                    placeholder="Écrivez le contenu de votre message..."
                  />
                </div>
                <Button type="submit" className="bg-blue-900 hover:bg-blue-950 text-white font-bold">
                  Publier le sujet
                </Button>
              </form>
            </Card>
          )}

          {subjects.length === 0 ? (
            <p className="text-slate-400 text-center py-12 border border-dashed rounded-xl">Aucun sujet de discussion. Soyez le premier à en créer un !</p>
          ) : (
            <div className="space-y-3">
              {subjects.map((sub) => (
                <Card
                  key={sub.id}
                  onClick={() => handleSubjectSelect(sub)}
                  className="hover:shadow-sm cursor-pointer border border-slate-100 rounded-2xl bg-white p-5 flex items-center justify-between transition-all"
                >
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      {sub.titre}
                      {sub.resolu && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> Résolu
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Par {sub.profiles.prenom} {sub.profiles.nom} • Le {new Date(sub.created_at).toLocaleDateString('fr-CA')}
                    </p>
                  </div>
                  <MessageSquare className="w-5 h-5 text-slate-350" />
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: MESSAGES */}
      {view === 'messages' && selectedSubject && (
        <div className="space-y-6">
          <div className="bg-slate-50/50 p-4 border rounded-xl">
            <h3 className="font-bold text-slate-900 text-base">{selectedSubject.titre}</h3>
            <p className="text-xs text-slate-500">
              Lancé par {selectedSubject.profiles.prenom} {selectedSubject.profiles.nom} le {new Date(selectedSubject.created_at).toLocaleDateString('fr-CA')}
            </p>
          </div>

          <div className="space-y-4">
            {forumMessages.map((msg) => (
              <Card key={msg.id} className="border border-slate-100 rounded-2xl bg-white p-5">
                <div className="flex justify-between items-start border-b border-slate-50 pb-2 mb-3">
                  <span className="font-bold text-xs text-blue-900">{msg.profiles.prenom} {msg.profiles.nom}</span>
                  <span className="text-[10px] text-slate-455">{new Date(msg.created_at).toLocaleDateString('fr-CA')} à {new Date(msg.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{msg.message}</p>
              </Card>
            ))}
          </div>

          <Card className="border border-slate-100 shadow-md rounded-2xl bg-white p-5">
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reply">Votre réponse</Label>
                <textarea
                  id="reply"
                  required
                  rows={4}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white text-sm"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Écrivez votre message..."
                />
              </div>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-950 text-white font-bold">
                Répondre
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
