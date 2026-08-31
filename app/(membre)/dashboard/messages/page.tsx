'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, User, Search, MessageSquare, ShieldCheck } from 'lucide-react';

interface Profile {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  role?: string;
  avatar_url?: string | null;
}

interface Message {
  id: string;
  expediteur_id: string;
  destinataire_id: string;
  contenu: string;
  created_at: string;
}

export default function MessagesPage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        // Fetch all other profiles to message
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, prenom, nom, email, role, avatar_url')
          .neq('id', user.id)
          .in('statut_adhesion', ['approuve', 'en_attente_paiement'])
          .order('nom', { ascending: true });

        if (profiles) {
          setMembers(profiles);
          setFilteredMembers(profiles);
        }
      }
    };

    init();
  }, [supabase]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMembers(members);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredMembers(
        members.filter(m => `${m.prenom} ${m.nom}`.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      );
    }
  }, [searchQuery, members]);

  useEffect(() => {
    if (!selectedMember || !currentUser) return;

    fetchMessages();

    // Set up real-time messaging using Supabase PostgreSQL changes
    const channel = supabase
      .channel('messages_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages_prives' },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.expediteur_id === currentUser.id && msg.destinataire_id === selectedMember.id) ||
            (msg.expediteur_id === selectedMember.id && msg.destinataire_id === currentUser.id)
          ) {
            setMessages((prev) => [...prev, msg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMember, currentUser, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    if (!selectedMember || !currentUser) return;

    const { data } = await supabase
      .from('messages_prives')
      .select('*')
      .or(`and(expediteur_id.eq.${currentUser.id},destinataire_id.eq.${selectedMember.id}),and(expediteur_id.eq.${selectedMember.id},destinataire_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedMember || !currentUser) return;

    const text = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase
      .from('messages_prives')
      .insert({
        expediteur_id: currentUser.id,
        destinataire_id: selectedMember.id,
        contenu: text,
        lu: false,
      });

    if (error) {
      console.error(error);
      alert("Erreur lors de l'envoi du message.");
    }
  };

  const getInitials = (prenom: string, nom: string) => {
    return `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-blue-950">Messagerie Interne</h1>
        <p className="text-sm text-slate-500">Échangez en direct avec les autres membres de l&apos;association.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[650px] items-stretch">
        {/* Liste des membres */}
        <Card className="border border-slate-200/80 shadow-md rounded-2xl bg-white flex flex-col lg:col-span-1 overflow-hidden">
          <CardHeader className="border-b border-slate-100 px-5 py-4 bg-slate-50/50 space-y-3">
            <CardTitle className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Contacts</span>
              <span className="text-xs font-semibold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full">
                {filteredMembers.length}
              </span>
            </CardTitle>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un membre..."
                className="pl-9 h-9 text-xs bg-white border-slate-200 rounded-xl"
              />
            </div>
          </CardHeader>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50 p-2 space-y-1">
            {filteredMembers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10 italic">Aucun contact trouvé.</p>
            ) : (
              filteredMembers.map((mem) => {
                const isSelected = selectedMember?.id === mem.id;
                return (
                  <button
                    key={mem.id}
                    onClick={() => setSelectedMember(mem)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                      isSelected
                        ? 'bg-blue-900 text-white shadow-md'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected ? 'bg-amber-500 text-blue-950' : 'bg-blue-50 text-blue-900'
                    }`}>
                      {getInitials(mem.prenom, mem.nom)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold truncate">
                          {mem.prenom} {mem.nom}
                        </span>
                        {['admin_ca', 'tresorier', 'superadmin'].includes(mem.role || '') && (
                          <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-amber-500'}`} />
                        )}
                      </div>
                      <div className={`text-xs truncate ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                        {mem.email}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Fenêtre de discussion */}
        <Card className="border border-slate-200/80 shadow-md rounded-2xl bg-white flex flex-col lg:col-span-2 overflow-hidden h-full">
          {selectedMember ? (
            <>
              {/* Header discussion */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-900 text-amber-400 font-bold text-xs flex items-center justify-center shadow-sm">
                    {getInitials(selectedMember.prenom, selectedMember.nom)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      {selectedMember.prenom} {selectedMember.nom}
                      {['admin_ca', 'tresorier', 'superadmin'].includes(selectedMember.role || '') && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                          CA / Bureau
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">{selectedMember.email}</p>
                  </div>
                </div>
              </div>

              {/* Zone des messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                {messages.length === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-16 italic">
                    Aucun message échangé pour le moment. Tapez votre premier message ci-dessous !
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.expediteur_id === currentUser?.id;
                    const dateStr = new Date(msg.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] p-4 rounded-2xl text-sm shadow-sm space-y-1.5 ${
                          isOwn
                            ? 'bg-blue-900 text-white rounded-tr-none'
                            : 'bg-white text-slate-800 border border-slate-150 rounded-tl-none'
                        }`}>
                          <p className="leading-relaxed font-medium">{msg.contenu}</p>
                          <span className={`text-[9px] block text-right font-semibold ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                            {dateStr}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Formulaire d'envoi */}
              <form onSubmit={handleSend} className="p-4 border-t border-slate-150 bg-white flex gap-3 items-center">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Écrivez votre message..."
                  className="flex-1 h-11 border-slate-200 focus-visible:ring-blue-900 rounded-xl"
                />
                <Button type="submit" disabled={!newMessage.trim()} className="h-11 px-5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl shadow-md transition-all">
                  <Send className="w-4 h-4 mr-1.5" /> Envoyer
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/20">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-900 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Messagerie privée</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Sélectionnez un membre dans la liste à gauche pour consulter l&apos;historique de vos échanges ou démarrer une nouvelle conversation.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

