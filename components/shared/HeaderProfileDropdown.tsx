'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { User, Settings, LogOut, Shield, Bell, ChevronDown, Lock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface Profile {
  prenom: string;
  nom: string;
  role: string;
  email?: string;
  avatar_url?: string | null;
  statut_adhesion?: string | null;
}

interface HeaderProfileDropdownProps {
  profile: Profile;
  isAdminSpace?: boolean;
}

export default function HeaderProfileDropdown({ profile, isAdminSpace = false }: HeaderProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdminRole = ['admin_ca', 'tresorier', 'superadmin'].includes(profile.role);

  const supabase = createClient();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchNotifications();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setNotifications(data);
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ lu: true })
      .eq('profile_id', user.id);

    fetchNotifications();
  };

  return (
    <div ref={dropdownRef} className="flex items-center gap-4 relative">
      {/* Notifications Icon */}
      <div className="relative">
        <button
          onClick={() => {
            setShowNotifications(!showNotifications);
            setIsOpen(false);
          }}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          {notifications.some(n => !n.lu) && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          )}
        </button>

        {showNotifications && (
          <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-150 rounded-2xl shadow-xl py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 pb-2 border-b flex justify-between items-center">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Notifications
              </h4>
              {notifications.some(n => !n.lu) && (
                <button onClick={markAllAsRead} className="text-[10px] text-blue-900 hover:underline font-bold flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> Tout lire
                </button>
              )}
            </div>
            <div className="divide-y max-h-60 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 italic">Aucune notification.</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`p-3 transition-colors text-xs space-y-1 ${!n.lu ? 'bg-amber-50/20' : 'hover:bg-slate-50'}`}>
                    <p className="text-slate-800 font-bold leading-normal">{n.titre}</p>
                    <p className="text-slate-650 leading-normal text-[11px]">{n.contenu}</p>
                    <span className="text-[9px] text-slate-400 font-semibold block">
                      {new Date(n.created_at).toLocaleDateString('fr-CA', { dateStyle: 'short' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Space Switch Button (Directly on header) */}
      {isAdminRole && (
        <Link
          href={isAdminSpace ? '/dashboard' : '/admin'}
          className={`hidden sm:inline-flex items-center justify-center font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-sm ${
            isAdminSpace
              ? 'bg-amber-500 hover:bg-amber-600 text-blue-950'
              : 'bg-blue-950 hover:bg-blue-900 text-white'
          }`}
        >
          {isAdminSpace ? 'Accéder à l\'Espace Membre' : 'Accéder à l\'Espace Admin'}
        </Link>
      )}

      {/* Profile Dropdown Trigger */}
      <div className="relative">
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setShowNotifications(false);
          }}
          className="flex items-center gap-2 p-1.5 hover:bg-slate-100/80 rounded-xl transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-full bg-slate-200 border overflow-hidden flex items-center justify-center">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-slate-500" />
            )}
          </div>
          <span className="text-xs font-bold text-slate-750 hidden md:inline-block">
            {profile.prenom} {profile.nom}
          </span>
          <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-150 rounded-2xl shadow-xl py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header info */}
            <div className="px-4 pb-3 border-b">
              <p className="text-sm font-bold text-slate-900 leading-tight">
                {profile.prenom} {profile.nom}
              </p>
              <span className="inline-block mt-1 text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full capitalize">
                {profile.role.replace('_', ' ')}
              </span>
            </div>

            {/* Menu Links */}
            <div className="p-1 space-y-0.5">
              {/* Space Switch for mobile or inside dropdown */}
              {isAdminRole && (
                <Link
                  href={isAdminSpace ? '/dashboard' : '/admin'}
                  onClick={() => setIsOpen(false)}
                  className="flex sm:hidden items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  <Shield className="w-4 h-4 text-amber-500" />
                  {isAdminSpace ? 'Espace Membre' : 'Espace Admin'}
                </Link>
              )}

              {['approuve', 'en_attente_paiement'].includes(profile.statut_adhesion || '') && (
                <Link
                  href="/dashboard/profil"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  Mon Profil & Sécurité
                </Link>
              )}
            </div>

            {/* Logout section */}
            <div className="border-t pt-2 px-2">
              <form action="/api/auth/signout" method="POST">
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full justify-start gap-2 h-9 text-xs bg-red-800 hover:bg-red-950 font-bold"
                >
                  <LogOut className="w-3.5 h-3.5" /> Déconnexion
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
