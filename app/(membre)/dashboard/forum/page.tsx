'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ChevronRight,
  ArrowLeft,
  MessageSquare,
  Plus,
  Check,
  Search,
  CheckCircle2,
  User,
  ShieldCheck,
  Sparkles,
  Clock,
  MessageCircle,
  FolderKanban,
  Send,
  HelpCircle,
  CheckSquare
} from 'lucide-react';

interface Category {
  id: string;
  nom: string;
  description: string;
  topicCount?: number;
}

interface Subject {
  id: string;
  categorie_id: string;
  titre: string;
  resolu: boolean;
  created_at: string;
  auteur_id?: string;
  profiles: {
    id?: string;
    prenom: string;
    nom: string;
    role?: string;
    avatar_url?: string | null;
  };
  replyCount?: number;
}

interface ForumMessage {
  id: string;
  sujet_id: string;
  auteur_id?: string;
  message: string;
  created_at: string;
  profiles: {
    id?: string;
    prenom: string;
    nom: string;
    role?: string;
    avatar_url?: string | null;
  };
}

export default function ForumPage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('membre');

  // Navigation views: 'categories' | 'subjects' | 'messages'
  const [view, setView] = useState<'categories' | 'subjects' | 'messages'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const [forumMessages, setForumMessages] = useState<ForumMessage[]>([]);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<'all' | 'open' | 'resolved'>('all');

  // Form states
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  const [newSubjectFirstMsg, setNewSubjectFirstMsg] = useState('');
  const [newReplyMessage, setNewReplyMessage] = useState('');
  const [showNewSubjectForm, setShowNewSubjectForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load: User & Categories
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (prof) setCurrentUserRole(prof.role || 'membre');
      }

      fetchCategories();
    };

    init();
  }, [supabase]);

  // Fetch Categories and calculate topic count
  const fetchCategories = async () => {
    const { data: cats } = await supabase
      .from('forum_categories')
      .select('*')
      .order('nom');

    if (!cats || cats.length === 0) {
      // Seed default categories if empty
      const defaultCats = [
        { nom: 'Mentorat & Carrière', description: 'Échangez sur la recherche de stages, d&apos;emplois et le mentorat professionnel.' },
        { nom: 'Aide aux études', description: 'Entraide pour les cours, les devoirs, les examens et la vie à l&apos;UQO.' },
        { nom: 'Entrepreneuriat & Projets', description: 'Partagez vos projets d&apos;entreprise, vos start-ups et vos initiatives.' },
        { nom: 'Vie Associative & Événements', description: 'Idées, suggestions et retours sur la vie de Synergie UQO.' },
      ];
      await supabase.from('forum_categories').insert(defaultCats);
      const { data: refetched } = await supabase.from('forum_categories').select('*').order('nom');
      if (refetched) setCategories(refetched);
    } else {
      // Fetch topic count for each category
      const { data: allTopics } = await supabase.from('forum_sujets').select('categorie_id');
      const countsMap = new Map<string, number>();
      (allTopics || []).forEach(t => {
        countsMap.set(t.categorie_id, (countsMap.get(t.categorie_id) || 0) + 1);
      });

      const enrichedCats = cats.map(c => ({
        ...c,
        topicCount: countsMap.get(c.id) || 0,
      }));

      setCategories(enrichedCats);
    }
  };

  // 2. Select Category & Load Subjects
  const handleCategorySelect = async (cat: Category) => {
    setSelectedCategory(cat);
    setView('subjects');
    setShowNewSubjectForm(false);
    setSearchQuery('');
    fetchSubjectsForCategory(cat.id);
  };

  const fetchSubjectsForCategory = async (categoryId: string) => {
    const { data: subsData } = await supabase
      .from('forum_sujets')
      .select(`
        id,
        categorie_id,
        auteur_id,
        titre,
        resolu,
        created_at,
        profiles:auteur_id (
          id,
          prenom,
          nom,
          role,
          avatar_url
        )
      `)
      .eq('categorie_id', categoryId)
      .order('created_at', { ascending: false });

    if (subsData) {
      // Fetch reply counts for these subjects
      const subIds = subsData.map(s => s.id);
      let replyCountsMap = new Map<string, number>();

      if (subIds.length > 0) {
        const { data: replies } = await supabase
          .from('forum_messages')
          .select('sujet_id')
          .in('sujet_id', subIds);

        (replies || []).forEach(r => {
          replyCountsMap.set(r.sujet_id, (replyCountsMap.get(r.sujet_id) || 0) + 1);
        });
      }

      const enrichedSubs = subsData.map(s => ({
        ...s,
        profiles: (s.profiles as any) || { prenom: 'Membre', nom: 'Anonyme' },
        replyCount: replyCountsMap.get(s.id) || 0,
      }));

      setSubjects(enrichedSubs as any);
    }
  };

  // 3. Select Subject & Load Messages
  const handleSubjectSelect = async (sub: Subject) => {
    setSelectedSubject(sub);
    setView('messages');
    fetchMessagesForSubject(sub.id);
  };

  const fetchMessagesForSubject = async (subjectId: string) => {
    const { data } = await supabase
      .from('forum_messages')
      .select(`
        id,
        sujet_id,
        auteur_id,
        message,
        created_at,
        profiles:auteur_id (
          id,
          prenom,
          nom,
          role,
          avatar_url
        )
      `)
      .eq('sujet_id', subjectId)
      .order('created_at', { ascending: true });

    if (data) {
      const enrichedMsgs = data.map(m => ({
        ...m,
        profiles: (m.profiles as any) || { prenom: 'Membre', nom: 'Anonyme' },
      }));
      setForumMessages(enrichedMsgs as any);
    }
  };

  // 4. Realtime updates for live replies on open subject
  useEffect(() => {
    if (view !== 'messages' || !selectedSubject) return;

    const channel = supabase
      .channel(`forum_messages_${selectedSubject.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_messages',
          filter: `sujet_id=eq.${selectedSubject.id}`,
        },
        async () => {
          fetchMessagesForSubject(selectedSubject.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [view, selectedSubject, supabase]);

  // Auto-scroll messages
  useEffect(() => {
    if (view === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [forumMessages, view]);

  // Create new Subject Thread
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectTitle.trim() || !newSubjectFirstMsg.trim() || !currentUser || !selectedCategory) return;

    setIsSubmitting(true);

    try {
      // 1. Create Subject
      const { data: subData, error: subErr } = await supabase
        .from('forum_sujets')
        .insert({
          categorie_id: selectedCategory.id,
          auteur_id: currentUser.id,
          titre: newSubjectTitle.trim(),
          resolu: false,
        })
        .select()
        .single();

      if (subErr || !subData) {
        console.error(subErr);
        alert("Erreur lors de la création du sujet.");
        setIsSubmitting(false);
        return;
      }

      // 2. Create first message
      await supabase.from('forum_messages').insert({
        sujet_id: subData.id,
        auteur_id: currentUser.id,
        message: newSubjectFirstMsg.trim(),
      });

      setNewSubjectTitle('');
      setNewSubjectFirstMsg('');
      setShowNewSubjectForm(false);
      fetchSubjectsForCategory(selectedCategory.id);
      fetchCategories();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send Reply Message to Subject Thread
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyMessage.trim() || !currentUser || !selectedSubject) return;

    const text = newReplyMessage.trim();
    setNewReplyMessage('');
    setIsSubmitting(true);

    const { error } = await supabase.from('forum_messages').insert({
      sujet_id: selectedSubject.id,
      auteur_id: currentUser.id,
      message: text,
    });

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      alert("Erreur lors de l'envoi de la réponse.");
    } else {
      fetchMessagesForSubject(selectedSubject.id);
    }
  };

  // Toggle Resolve status of subject (Author or Admin)
  const handleToggleResolve = async () => {
    if (!selectedSubject || !currentUser) return;
    const newStatus = !selectedSubject.resolu;

    const { error } = await supabase
      .from('forum_sujets')
      .update({ resolu: newStatus })
      .eq('id', selectedSubject.id);

    if (!error) {
      setSelectedSubject(prev => prev ? { ...prev, resolu: newStatus } : null);
      if (selectedCategory) fetchSubjectsForCategory(selectedCategory.id);
    }
  };

  // Filter subjects by status and search query
  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => {
      // Filter by status tab
      if (subjectFilter === 'open' && s.resolu) return false;
      if (subjectFilter === 'resolved' && !s.resolu) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const authorName = `${s.profiles?.prenom || ''} ${s.profiles?.nom || ''}`.toLowerCase();
        return s.titre.toLowerCase().includes(q) || authorName.includes(q);
      }

      return true;
    });
  }, [subjects, subjectFilter, searchQuery]);

  const getInitials = (prenom?: string, nom?: string) => {
    return `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase() || 'U';
  };

  const isAdmin = ['admin_ca', 'tresorier', 'superadmin'].includes(currentUserRole);

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
                    if (selectedCategory) fetchSubjectsForCategory(selectedCategory.id);
                  } else {
                    setView('categories');
                  }
                }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              {/* Breadcrumb path */}
              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                <span className="cursor-pointer hover:text-blue-900" onClick={() => setView('categories')}>Forums</span>
                {selectedCategory && (
                  <>
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                    <span className="cursor-pointer hover:text-blue-900" onClick={() => { setView('subjects'); if (selectedCategory) fetchSubjectsForCategory(selectedCategory.id); }}>
                      {selectedCategory.nom}
                    </span>
                  </>
                )}
                {selectedSubject && (
                  <>
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                    <span className="text-slate-600 truncate max-w-[200px]">{selectedSubject.titre}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-50 text-blue-950 rounded-2xl">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Forums de Discussion</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── VIEW 1: CATEGORIES LIST ─── */}
      {view === 'categories' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-amber-500" /> Catégories de discussion
            </h2>
            <span className="text-xs text-slate-400 font-medium">{categories.length} catégories</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((cat) => (
              <Card
                key={cat.id}
                onClick={() => handleCategorySelect(cat)}
                className="hover:shadow-xl cursor-pointer transition-all border border-slate-200/80 rounded-3xl bg-white flex flex-col justify-between overflow-hidden group hover:border-blue-950 p-6 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-950 flex items-center justify-center group-hover:bg-blue-950 group-hover:text-amber-400 transition-colors shrink-0">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
                    {cat.topicCount || 0} sujet{(cat.topicCount || 0) > 1 ? 's' : ''}
                  </span>
                </div>

                <div>
                  <CardTitle className="text-xl font-extrabold text-slate-900 group-hover:text-blue-950 transition-colors">
                    {cat.nom}
                  </CardTitle>
                  <CardDescription className="text-slate-500 text-xs mt-2 leading-relaxed font-medium">
                    {cat.description}
                  </CardDescription>
                </div>

                <div className="pt-2 flex justify-end text-blue-950 font-extrabold items-center gap-1 text-xs group-hover:translate-x-1 transition-transform">
                  Parcourir les sujets <ChevronRight className="w-4 h-4 text-amber-500" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── VIEW 2: SUBJECTS LIST IN SELECTED CATEGORY ─── */}
      {view === 'subjects' && selectedCategory && (
        <div className="space-y-6">
          {/* Category Banner & Action Bar */}
          <div className="bg-white p-6 sm:p-8 border border-slate-200/80 shadow-md rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-950 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                  Catégorie
                </span>
                <h2 className="font-extrabold text-2xl text-slate-900 mt-2">{selectedCategory.nom}</h2>
                <p className="text-xs text-slate-500 mt-1">{selectedCategory.description}</p>
              </div>

              <Button
                onClick={() => setShowNewSubjectForm(!showNewSubjectForm)}
                className="bg-blue-950 hover:bg-blue-900 text-white text-xs font-extrabold gap-2 h-11 px-5 rounded-xl shadow-md shrink-0"
              >
                <Plus className="w-4 h-4 text-amber-400" /> Ouvrir une nouvelle discussion
              </Button>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une discussion dans cette catégorie..."
                  className="pl-10 h-10 text-xs bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-xl shrink-0">
                <button
                  onClick={() => setSubjectFilter('all')}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                    subjectFilter === 'all' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tous ({subjects.length})
                </button>
                <button
                  onClick={() => setSubjectFilter('open')}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                    subjectFilter === 'open' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Ouverts ({subjects.filter(s => !s.resolu).length})
                </button>
                <button
                  onClick={() => setSubjectFilter('resolved')}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                    subjectFilter === 'resolved' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Résolus ({subjects.filter(s => s.resolu).length})
                </button>
              </div>
            </div>
          </div>

          {/* New Subject Form Modal / Drawer */}
          {showNewSubjectForm && (
            <Card className="border-2 border-blue-950 shadow-2xl rounded-3xl bg-white p-6 sm:p-8 animate-in fade-in slide-in-from-top-4 duration-200">
              <form onSubmit={handleCreateSubject} className="space-y-5">
                <div className="flex justify-between items-center pb-2 border-b">
                  <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" /> Démarrer une nouvelle discussion
                  </h3>
                  <Button type="button" variant="ghost" onClick={() => setShowNewSubjectForm(false)} className="text-xs text-slate-500">
                    Fermer
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="title" className="font-bold text-xs uppercase tracking-wider text-slate-700">Titre de la discussion *</Label>
                  <Input
                    id="title"
                    required
                    value={newSubjectTitle}
                    onChange={(e) => setNewSubjectTitle(e.target.value)}
                    placeholder="Ex: Conseils pour recherche de stage en informatique / Inscription cours"
                    className="h-11 rounded-xl border-slate-200 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="firstMsg" className="font-bold text-xs uppercase tracking-wider text-slate-700">Message initial *</Label>
                  <textarea
                    id="firstMsg"
                    required
                    rows={4}
                    className="w-full p-4 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-950 bg-slate-50 text-xs font-medium focus:bg-white transition-colors"
                    value={newSubjectFirstMsg}
                    onChange={(e) => setNewSubjectFirstMsg(e.target.value)}
                    placeholder="Exposez votre question, idée ou demande à la communauté..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowNewSubjectForm(false)} className="rounded-xl text-xs font-bold">
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-blue-950 hover:bg-blue-900 text-white font-extrabold h-11 rounded-xl px-6">
                    {isSubmitting ? "Publication..." : "Publier la discussion"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Subjects List */}
          {filteredSubjects.length === 0 ? (
            <div className="text-slate-400 text-center py-16 bg-white border border-slate-200/80 rounded-3xl text-xs italic space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Aucune discussion ne correspond à vos critères dans cette catégorie.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubjects.map((sub) => {
                const authorIsAdmin = ['admin_ca', 'tresorier', 'superadmin'].includes(sub.profiles?.role || '');
                return (
                  <Card
                    key={sub.id}
                    onClick={() => handleSubjectSelect(sub)}
                    className="hover:shadow-lg cursor-pointer border border-slate-200/80 rounded-2xl bg-white p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-blue-950 group"
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Author Avatar */}
                      <div className="w-10 h-10 rounded-full bg-blue-950 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden shadow-sm mt-0.5">
                        {sub.profiles?.avatar_url ? (
                          <img src={sub.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(sub.profiles?.prenom, sub.profiles?.nom)
                        )}
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-950 transition-colors leading-snug">
                            {sub.titre}
                          </h3>
                          {sub.resolu ? (
                            <span className="bg-emerald-100 text-emerald-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0">
                              <Check className="w-3 h-3 text-emerald-600" /> Résolu
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-200 shrink-0">
                              En cours
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            Par <strong className="text-slate-800">{sub.profiles?.prenom} {sub.profiles?.nom}</strong>
                            {authorIsAdmin && (
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-500 inline shrink-0" />
                            )}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                            <Clock className="w-3 h-3" /> {new Date(sub.created_at).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-extrabold bg-blue-50 text-blue-950 border border-blue-100 px-3.5 py-2 rounded-xl shrink-0 group-hover:bg-blue-950 group-hover:text-white transition-colors">
                      <MessageCircle className="w-4 h-4 text-amber-500" />
                      <span>{sub.replyCount || 0} réponse{(sub.replyCount || 0) > 1 ? 's' : ''}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── VIEW 3: THREAD MESSAGES IN SELECTED SUBJECT ─── */}
      {view === 'messages' && selectedSubject && (
        <div className="space-y-6">
          {/* Thread Header Banner */}
          <div className="bg-white p-6 sm:p-8 border border-slate-200/80 shadow-md rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedSubject.resolu ? (
                    <span className="bg-emerald-100 text-emerald-900 text-xs font-extrabold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Discussion Résolue
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-900 text-xs font-extrabold px-3 py-1 rounded-full border border-amber-200">
                      Discussion Ouverte
                    </span>
                  )}
                  {selectedCategory && (
                    <span className="bg-slate-100 text-slate-700 text-xs font-extrabold px-3 py-1 rounded-full border">
                      {selectedCategory.nom}
                    </span>
                  )}
                </div>

                <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight leading-snug">
                  {selectedSubject.titre}
                </h2>

                <p className="text-xs text-slate-500 font-medium">
                  Discussion lancée par <strong className="text-slate-800">{selectedSubject.profiles?.prenom} {selectedSubject.profiles?.nom}</strong> le {new Date(selectedSubject.created_at).toLocaleDateString('fr-CA', { dateStyle: 'long' })}
                </p>
              </div>

              {/* Resolve Button for Author or Admin */}
              {(selectedSubject.auteur_id === currentUser?.id || isAdmin) && (
                <Button
                  onClick={handleToggleResolve}
                  className={`text-xs font-extrabold h-10 px-4 rounded-xl gap-2 shadow-sm shrink-0 ${
                    selectedSubject.resolu
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {selectedSubject.resolu ? 'Rouvrir le sujet' : 'Marquer comme résolu'}
                </Button>
              )}
            </div>
          </div>

          {/* Messages Feed */}
          <div className="space-y-4">
            {forumMessages.map((msg, index) => {
              const isTopicAuthor = msg.auteur_id === selectedSubject.auteur_id;
              const msgIsAdmin = ['admin_ca', 'tresorier', 'superadmin'].includes(msg.profiles?.role || '');

              return (
                <Card
                  key={msg.id}
                  className={`border rounded-3xl bg-white p-6 shadow-sm space-y-3 transition-all ${
                    index === 0 ? 'border-blue-950 ring-1 ring-blue-950/10' : 'border-slate-200/80'
                  }`}
                >
                  {/* Message Author Info */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-950 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                        {msg.profiles?.avatar_url ? (
                          <img src={msg.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(msg.profiles?.prenom, msg.profiles?.nom)
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {msg.profiles?.prenom} {msg.profiles?.nom}
                          </span>
                          {isTopicAuthor && (
                            <span className="bg-blue-100 text-blue-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
                              Auteur du sujet
                            </span>
                          )}
                          {msgIsAdmin && (
                            <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-amber-600" /> CA / Bureau
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-400 font-medium shrink-0">
                      {new Date(msg.created_at).toLocaleDateString('fr-CA')} à {new Date(msg.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Message Body */}
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                    {msg.message}
                  </p>
                </Card>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Form */}
          <Card className="border border-slate-200/80 shadow-lg rounded-3xl bg-white p-6 sm:p-8">
            <form onSubmit={handleSendReply} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reply" className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Votre message de réponse *
                </Label>
                <textarea
                  id="reply"
                  required
                  rows={4}
                  className="w-full p-4 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-950 bg-slate-50 text-xs font-medium focus:bg-white transition-colors"
                  value={newReplyMessage}
                  onChange={(e) => setNewReplyMessage(e.target.value)}
                  placeholder="Apportez une réponse claire et constructive à la communauté..."
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting || !newReplyMessage.trim()}
                  className="bg-blue-950 hover:bg-blue-900 text-white font-extrabold h-11 rounded-xl px-6 gap-2"
                >
                  <Send className="w-4 h-4 text-amber-400" /> Envoyez la réponse
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
