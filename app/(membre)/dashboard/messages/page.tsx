'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Send,
  User,
  Search,
  MessageSquare,
  ShieldCheck,
  Plus,
  MessageCircle,
  Users,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

interface Profile {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  role?: string;
  avatar_url?: string | null;
  profil_public?: boolean;
  statut_adhesion?: string | null;
}

interface Message {
  id: string;
  expediteur_id: string;
  destinataire_id: string;
  contenu: string;
  lu: boolean;
  created_at: string;
}

interface Conversation {
  contact: Profile;
  lastMessage: Message;
  unreadCount: number;
}

export default function MessagesPage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allDirectoryProfiles, setAllDirectoryProfiles] = useState<Profile[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'discussions' | 'annuaire'>('discussions');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load: Current User, Profiles (RLS filtered), and all private messages involving current user
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      // Fetch user profile role
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const myRole = myProfile?.role || 'membre';
      const isUserAdmin = ['admin_ca', 'tresorier', 'superadmin'].includes(myRole);

      // Fetch directory profiles allowed by RLS
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, prenom, nom, email, role, avatar_url, profil_public, statut_adhesion')
        .neq('id', user.id)
        .order('nom', { ascending: true });

      if (profiles) {
        // Filter profiles based on member privacy settings:
        // Admins see everyone; regular members see CA/Admins + members with profil_public === true
        const visibleProfiles = profiles.filter((p: any) => {
          if (isUserAdmin) return true;
          if (['admin_ca', 'tresorier', 'superadmin'].includes(p.role || '')) return true;
          if (p.profil_public === true) return true;
          return false;
        });

        setAllDirectoryProfiles(visibleProfiles);
      }

      // Fetch all messages involving the current user
      const { data: msgs } = await supabase
        .from('messages_prives')
        .select('*')
        .or(`expediteur_id.eq.${user.id},destinataire_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (msgs) {
        setAllMessages(msgs);
      }
    };

    init();
  }, [supabase]);

  // 2. Realtime Listener for new incoming or updated private messages
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('messages_realtime_global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages_prives' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message;
            if (newMsg.expediteur_id === currentUser.id || newMsg.destinataire_id === currentUser.id) {
              setAllMessages((prev) => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as Message;
            setAllMessages((prev) =>
              prev.map(m => (m.id === updatedMsg.id ? updatedMsg : m))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, supabase]);

  // 3. Automatically mark unread messages as read when opening a conversation
  useEffect(() => {
    if (!selectedMember || !currentUser) return;

    const markAsRead = async () => {
      const unreadIds = allMessages
        .filter(m => m.expediteur_id === selectedMember.id && m.destinataire_id === currentUser.id && !m.lu)
        .map(m => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from('messages_prives')
          .update({ lu: true })
          .in('id', unreadIds);

        setAllMessages(prev =>
          prev.map(m => (unreadIds.includes(m.id) ? { ...m, lu: true } : m))
        );
      }
    };

    markAsRead();
  }, [selectedMember, currentUser, allMessages, supabase]);

  // 4. Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, selectedMember]);

  // 5. Compute Active Conversations list ordered by last message timestamp (newest at top)
  const activeConversations = useMemo<Conversation[]>(() => {
    if (!currentUser) return [];

    const map = new Map<string, { lastMessage: Message; unreadCount: number; contactId: string }>();

    for (const msg of allMessages) {
      const partnerId = msg.expediteur_id === currentUser.id ? msg.destinataire_id : msg.expediteur_id;
      const existing = map.get(partnerId);

      const isUnreadReceived = msg.expediteur_id === partnerId && msg.destinataire_id === currentUser.id && !msg.lu;

      if (!existing) {
        map.set(partnerId, {
          lastMessage: msg,
          unreadCount: isUnreadReceived ? 1 : 0,
          contactId: partnerId,
        });
      } else {
        const lastMsgTime = new Date(existing.lastMessage.created_at).getTime();
        const currentMsgTime = new Date(msg.created_at).getTime();

        if (currentMsgTime > lastMsgTime) {
          existing.lastMessage = msg;
        }

        if (isUnreadReceived) {
          existing.unreadCount += 1;
        }
      }
    }

    const conversationsList: Conversation[] = [];

    map.forEach((value, contactId) => {
      // Find contact profile from directory or fallback object
      const contactProfile = allDirectoryProfiles.find(p => p.id === contactId) || {
        id: contactId,
        prenom: 'Membre',
        nom: 'UQO',
        email: '',
      };

      conversationsList.push({
        contact: contactProfile,
        lastMessage: value.lastMessage,
        unreadCount: value.unreadCount,
      });
    });

    // Order conversations by last message created_at descending (most recent on top!)
    return conversationsList.sort(
      (a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    );
  }, [allMessages, currentUser, allDirectoryProfiles]);

  // 6. Messages for the currently selected conversation
  const currentChatMessages = useMemo(() => {
    if (!selectedMember || !currentUser) return [];
    return allMessages.filter(
      m =>
        (m.expediteur_id === currentUser.id && m.destinataire_id === selectedMember.id) ||
        (m.expediteur_id === selectedMember.id && m.destinataire_id === currentUser.id)
    );
  }, [allMessages, selectedMember, currentUser]);

  // 7. Directory Search / Filtering
  const filteredDirectory = useMemo(() => {
    if (!searchQuery.trim()) return allDirectoryProfiles;
    const q = searchQuery.toLowerCase();
    return allDirectoryProfiles.filter(
      p => `${p.prenom} ${p.nom}`.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    );
  }, [searchQuery, allDirectoryProfiles]);

  // 8. Filter Active Conversations when searching in 'discussions' tab
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return activeConversations;
    const q = searchQuery.toLowerCase();
    return activeConversations.filter(
      c => `${c.contact.prenom} ${c.contact.nom}`.toLowerCase().includes(q) || c.contact.email.toLowerCase().includes(q)
    );
  }, [searchQuery, activeConversations]);

  // Handle Sending a Message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedMember || !currentUser) return;

    const text = newMessageText.trim();
    setNewMessageText('');

    const { data: insertedMsg, error } = await supabase
      .from('messages_prives')
      .insert({
        expediteur_id: currentUser.id,
        destinataire_id: selectedMember.id,
        contenu: text,
        lu: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Message send error:', error);
      alert("Erreur lors de l'envoi du message.");
    } else if (insertedMsg) {
      // Optimistically append to local state
      setAllMessages(prev => [...prev, insertedMsg]);
    }
  };

  const getInitials = (prenom?: string, nom?: string) => {
    return `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase() || 'U';
  };

  const formatMessageTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight">Messagerie Instantanée</h1>
          <p className="text-sm text-slate-500 mt-1">Échangez en direct avec vos contacts et l&apos;équipe de Synergie UQO.</p>
        </div>
        <Button
          onClick={() => {
            setActiveTab(activeTab === 'annuaire' ? 'discussions' : 'annuaire');
            setSearchQuery('');
          }}
          className="bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-xs h-10 px-4 rounded-xl gap-2 shadow-sm shrink-0"
        >
          {activeTab === 'annuaire' ? (
            <>
              <MessageCircle className="w-4 h-4 text-amber-400" /> Mes Discussions ({activeConversations.length})
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 text-amber-400" /> Nouveau contact / Annuaire
            </>
          )}
        </Button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[680px] items-stretch">
        
        {/* LEFT SIDEBAR: Active Discussions or Directory Search */}
        <Card className="border border-slate-200/80 shadow-md rounded-2xl bg-white flex flex-col lg:col-span-1 overflow-hidden">
          
          {/* Header & Mode Selector */}
          <CardHeader className="border-b border-slate-100 px-4 py-4 bg-slate-50/60 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('discussions')}
                  className={`text-xs font-extrabold pb-1 transition-all border-b-2 ${
                    activeTab === 'discussions'
                      ? 'border-blue-900 text-blue-950'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Discussions ({activeConversations.length})
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => setActiveTab('annuaire')}
                  className={`text-xs font-extrabold pb-1 transition-all border-b-2 ${
                    activeTab === 'annuaire'
                      ? 'border-blue-900 text-blue-950'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Annuaire ({allDirectoryProfiles.length})
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'discussions' ? "Filtrer mes discussions..." : "Rechercher dans l'annuaire..."}
                className="pl-9 h-9 text-xs bg-white border-slate-200 rounded-xl focus:border-blue-500"
              />
            </div>
          </CardHeader>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50 p-2 space-y-1">
            
            {/* TAB 1: ACTIVE DISCUSSIONS */}
            {activeTab === 'discussions' && (
              filteredConversations.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-14 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-slate-700">Aucune discussion active</p>
                  <p className="text-[11px] text-slate-400 leading-normal max-w-xs mx-auto">
                    Cliquez sur &quot;Nouveau contact&quot; ou utilisez l&apos;onglet Annuaire pour démarrer une conversation.
                  </p>
                  <Button
                    onClick={() => setActiveTab('annuaire')}
                    variant="outline"
                    className="text-xs h-8 px-3 rounded-lg border-blue-200 text-blue-900 font-bold"
                  >
                    Explorer l&apos;annuaire →
                  </Button>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = selectedMember?.id === conv.contact.id;
                  const isAdmin = ['admin_ca', 'tresorier', 'superadmin'].includes(conv.contact.role || '');
                  const hasUnread = conv.unreadCount > 0;

                  return (
                    <button
                      key={conv.contact.id}
                      onClick={() => {
                        setSelectedMember(conv.contact);
                      }}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left relative ${
                        isSelected
                          ? 'bg-blue-950 text-white shadow-md'
                          : hasUnread
                          ? 'bg-amber-50/60 hover:bg-amber-50 text-slate-900 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0 mt-0.5">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden ${
                          isSelected ? 'bg-amber-500 text-blue-950' : 'bg-blue-100 text-blue-900'
                        }`}>
                          {conv.contact.avatar_url ? (
                            <img src={conv.contact.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            getInitials(conv.contact.prenom, conv.contact.nom)
                          )}
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold truncate flex items-center gap-1">
                            {conv.contact.prenom} {conv.contact.nom}
                            {isAdmin && (
                              <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-amber-500'}`} />
                            )}
                          </span>
                          <span className={`text-[10px] shrink-0 font-medium ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                            {formatMessageTime(conv.lastMessage.created_at)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p className={`text-xs truncate font-medium ${
                            isSelected ? 'text-blue-200' : hasUnread ? 'text-slate-900 font-bold' : 'text-slate-500'
                          }`}>
                            {conv.lastMessage.expediteur_id === currentUser?.id ? 'Vous: ' : ''}
                            {conv.lastMessage.contenu}
                          </p>

                          {hasUnread && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-blue-950 shrink-0 animate-pulse">
                              {conv.unreadCount} nouveau{conv.unreadCount > 1 ? 'x' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )
            )}

            {/* TAB 2: DIRECTORY SEARCH */}
            {activeTab === 'annuaire' && (
              filteredDirectory.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-10 px-4 space-y-2">
                  <p className="italic">Aucun contact trouvé dans l&apos;annuaire.</p>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Seuls les administrateurs et les membres ayant activé l&apos;option &quot;Visibilité dans l&apos;annuaire public&quot; dans leurs préférences sont répertoriés.
                  </p>
                </div>
              ) : (
                filteredDirectory.map((mem) => {
                  const isSelected = selectedMember?.id === mem.id;
                  const isAdmin = ['admin_ca', 'tresorier', 'superadmin'].includes(mem.role || '');

                  return (
                    <button
                      key={mem.id}
                      onClick={() => {
                        setSelectedMember(mem);
                        setActiveTab('discussions');
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                        isSelected
                          ? 'bg-blue-950 text-white shadow-md'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden ${
                        isSelected ? 'bg-amber-500 text-blue-950' : 'bg-blue-50 text-blue-900'
                      }`}>
                        {mem.avatar_url ? (
                          <img src={mem.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(mem.prenom, mem.nom)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold truncate">
                            {mem.prenom} {mem.nom}
                          </span>
                          {isAdmin && (
                            <span className="text-[9px] bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                              CA / Bureau
                            </span>
                          )}
                        </div>
                        <div className={`text-xs truncate ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                          {mem.email}
                        </div>
                      </div>
                    </button>
                  );
                })
              )
            )}
          </div>
        </Card>

        {/* RIGHT AREA: Active Chat Box */}
        <Card className="border border-slate-200/80 shadow-md rounded-2xl bg-white flex flex-col lg:col-span-2 overflow-hidden h-full">
          {selectedMember ? (
            <>
              {/* Header discussion */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-950 text-amber-400 font-bold text-xs flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                    {selectedMember.avatar_url ? (
                      <img src={selectedMember.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(selectedMember.prenom, selectedMember.nom)
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      {selectedMember.prenom} {selectedMember.nom}
                      {['admin_ca', 'tresorier', 'superadmin'].includes(selectedMember.role || '') && (
                        <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-200">
                          CA / Bureau
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">{selectedMember.email}</p>
                  </div>
                </div>
              </div>

              {/* Chat Messages List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                {currentChatMessages.length === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-20 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-slate-700">Démarrer une conversation</p>
                    <p className="italic">Aucun message échangé pour le moment. Écrivez votre premier message ci-dessous !</p>
                  </div>
                ) : (
                  currentChatMessages.map((msg) => {
                    const isOwn = msg.expediteur_id === currentUser?.id;
                    const dateStr = formatMessageTime(msg.created_at);

                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] p-4 rounded-2xl text-sm shadow-sm space-y-1.5 ${
                          isOwn
                            ? 'bg-blue-950 text-white rounded-tr-none'
                            : 'bg-white text-slate-800 border border-slate-150 rounded-tl-none'
                        }`}>
                          <p className="leading-relaxed font-medium whitespace-pre-wrap">{msg.contenu}</p>
                          <div className={`flex items-center justify-end gap-1 text-[9px] font-semibold ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                            <span>{dateStr}</span>
                            {isOwn && (
                              msg.lu ? (
                                <CheckCheck className="w-3 h-3 text-amber-400" />
                              ) : (
                                <Check className="w-3 h-3 text-blue-300" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSend} className="p-4 border-t border-slate-150 bg-white flex gap-3 items-center shrink-0">
                <Input
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder={`Envoyer un message à ${selectedMember.prenom}...`}
                  className="flex-1 h-11 border-slate-200 focus-visible:ring-blue-950 rounded-xl text-sm"
                />
                <Button
                  type="submit"
                  disabled={!newMessageText.trim()}
                  className="h-11 px-5 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4 mr-1.5" /> Envoyer
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/20">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-950 flex items-center justify-center mb-4 shadow-sm">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Messagerie Instantanée</h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-4">
                Sélectionnez une discussion à gauche ou cliquez sur &quot;Nouveau contact&quot; pour rechercher un membre dans l&apos;annuaire et lancer un échange.
              </p>
              <Button
                onClick={() => setActiveTab('annuaire')}
                className="bg-blue-950 hover:bg-blue-900 text-white text-xs font-bold h-9 px-4 rounded-xl gap-2"
              >
                <Search className="w-3.5 h-3.5" /> Rechercher dans l&apos;annuaire
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
