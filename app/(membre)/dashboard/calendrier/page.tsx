'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Grid, Layers, List } from 'lucide-react';
import Link from 'next/link';

interface CalendarItem {
  id: string;
  type: 'evenement' | 'tache';
  titre: string;
  date: Date;
  details: string;
  lieu?: string;
  priorite?: string;
}

type CalendarView = 'month' | 'week' | 'day';

export default function UnifiedCalendarPage() {
  const supabase = createClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CalendarView>('month');

  useEffect(() => {
    fetchCalendarItems();
  }, [currentDate]);

  const fetchCalendarItems = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user profile role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'membre';
    const isAdminUser = ['admin_ca', 'tresorier', 'superadmin'].includes(role);

    // Dynamic Range based on view to minimize data load if needed, but fetching 3 months around currentDate is safe
    const startRange = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString();
    const endRange = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0, 23, 59, 59).toISOString();

    // 1. Fetch Events
    const { data: eventsData } = await supabase
      .from('evenements')
      .select('*')
      .eq('statut', 'publie')
      .gte('date_evenement', startRange)
      .lte('date_evenement', endRange);

    // Filter events based on audience targeting in JS
    const filteredEvents = (eventsData || []).filter(evt => {
      if (evt.audience === 'public' || evt.audience === 'membres') return true;
      if (evt.audience === 'administrateurs' && isAdminUser) return true;
      if (evt.audience === 'bureau' && isAdminUser) return true;
      return true;
    });

    // 2. Fetch Tasks assigned to the user
    const { data: tasksData } = await supabase
      .from('taches')
      .select('*')
      .eq('assigne_a', user.id)
      .gte('date_echeance', startRange)
      .lte('date_echeance', endRange);

    // Map to unified CalendarItem structure
    const mappedItems: CalendarItem[] = [];

    filteredEvents.forEach(evt => {
      mappedItems.push({
        id: evt.id,
        type: 'evenement',
        titre: evt.titre,
        date: new Date(evt.date_evenement),
        details: evt.description,
        lieu: evt.lieu
      });
    });

    (tasksData || []).forEach(task => {
      if (task.date_echeance) {
        mappedItems.push({
          id: task.id,
          type: 'tache',
          titre: `À Rendre: ${task.titre}`,
          date: new Date(task.date_echeance),
          details: task.description || '',
          priorite: task.priorite
        });
      }
    });

    setItems(mappedItems);
    setLoading(false);
  };

  // Month navigation helpers
  const handlePrev = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (view === 'week') {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(currentDate.getDate() - 7);
      setCurrentDate(prevWeek);
    } else {
      const prevDay = new Date(currentDate);
      prevDay.setDate(currentDate.getDate() - 1);
      setCurrentDate(prevDay);
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (view === 'week') {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(currentDate.getDate() + 7);
      setCurrentDate(nextWeek);
    } else {
      const nextDay = new Date(currentDate);
      nextDay.setDate(currentDate.getDate() + 1);
      setCurrentDate(nextDay);
    }
  };

  const setToday = () => {
    setCurrentDate(new Date());
  };

  // Helper: Month Days Builder
  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDaysCount = new Date(year, month, 0).getDate();
    const days = [];

    // Offset days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDaysCount - i),
        isCurrentMonth: false
      });
    }

    // Days of current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    return days;
  };

  // Helper: Week Days Builder
  const getWeekDays = () => {
    const days = [];
    const dayOfWeek = currentDate.getDay(); // 0 is Sunday
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Render Views
  const renderMonthView = () => {
    const days = getMonthDays();
    return (
      <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 border-b text-center font-bold text-xs py-3 text-slate-500 bg-slate-50">
          <span>Dim</span>
          <span>Lun</span>
          <span>Mar</span>
          <span>Mer</span>
          <span>Jeu</span>
          <span>Ven</span>
          <span>Sam</span>
        </div>
        <div className="grid grid-cols-7 divide-x divide-y border-t bg-slate-50/10">
          {days.map((dayObj, index) => {
            const dayItems = items.filter(
              item =>
                item.date.getDate() === dayObj.date.getDate() &&
                item.date.getMonth() === dayObj.date.getMonth() &&
                item.date.getFullYear() === dayObj.date.getFullYear()
            );
            const isToday = new Date().toDateString() === dayObj.date.toDateString();

            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 flex flex-col justify-between transition-colors bg-white ${
                  !dayObj.isCurrentMonth ? 'bg-slate-50/50 text-slate-350' : ''
                } ${isToday ? 'bg-blue-50/30 ring-2 ring-blue-900 ring-inset' : ''}`}
              >
                <span className={`text-xs font-bold ${isToday ? 'text-blue-900' : 'text-slate-600'}`}>
                  {dayObj.date.getDate()}
                </span>
                <div className="flex-1 mt-1 space-y-1 overflow-y-auto max-h-[85px] scrollbar-thin">
                  {dayItems.map(item => (
                    <Link
                      key={item.id}
                      href={item.type === 'evenement' ? `/evenements/${item.id}` : '/dashboard/taches'}
                      className={`block p-1 rounded text-[9px] font-bold leading-tight truncate hover:scale-102 transition-transform ${
                        item.type === 'evenement'
                          ? 'bg-amber-100 text-amber-900 border-l-2 border-amber-500'
                          : 'bg-emerald-100 text-emerald-900 border-l-2 border-emerald-500'
                      }`}
                      title={item.titre}
                    >
                      {item.titre}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const days = getWeekDays();
    return (
      <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 border-b text-center font-bold text-xs py-3 text-slate-500 bg-slate-50">
          {days.map((day, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <span>{day.toLocaleDateString('fr-CA', { weekday: 'short' })}</span>
              <span className="text-sm font-extrabold text-slate-900">{day.getDate()}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x min-h-[300px] bg-white">
          {days.map((day, idx) => {
            const dayItems = items.filter(
              item =>
                item.date.getDate() === day.getDate() &&
                item.date.getMonth() === day.getMonth() &&
                item.date.getFullYear() === day.getFullYear()
            );
            const isToday = new Date().toDateString() === day.toDateString();

            return (
              <div
                key={idx}
                className={`p-3 space-y-2 flex flex-col ${
                  isToday ? 'bg-blue-50/20' : ''
                }`}
              >
                {dayItems.length === 0 ? (
                  <span className="text-[10px] text-slate-300 italic block text-center mt-4">Aucun événement</span>
                ) : (
                  dayItems.map(item => (
                    <Link
                      key={item.id}
                      href={item.type === 'evenement' ? `/evenements/${item.id}` : '/dashboard/taches'}
                      className={`block p-2 rounded text-xs font-bold border-l-4 hover:scale-102 transition-transform ${
                        item.type === 'evenement'
                          ? 'bg-amber-50 text-amber-900 border-amber-500'
                          : 'bg-emerald-50 text-emerald-900 border-emerald-500'
                      }`}
                    >
                      <span className="block truncate">{item.titre}</span>
                      <span className="block text-[8px] text-slate-400 font-semibold mt-0.5">
                        {item.date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayItems = items.filter(
      item =>
        item.date.getDate() === currentDate.getDate() &&
        item.date.getMonth() === currentDate.getMonth() &&
        item.date.getFullYear() === currentDate.getFullYear()
    );

    return (
      <Card className="border border-slate-100 shadow-md rounded-2xl bg-white overflow-hidden">
        <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
          <span className="text-sm font-bold text-slate-800 capitalize">
            {currentDate.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <span className="text-xs text-slate-500 font-semibold">{dayItems.length} activité(s)</span>
        </div>
        <CardContent className="p-6 divide-y divide-slate-100">
          {dayItems.length === 0 ? (
            <p className="text-slate-400 text-center py-10 text-sm italic">Aucun événement ou tâche planifié pour ce jour.</p>
          ) : (
            dayItems.map(item => (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                      item.type === 'evenement' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {item.type}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      À {item.date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">{item.titre}</h3>
                  {item.lieu && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-blue-900" />
                      {item.lieu}
                    </span>
                  )}
                  {item.details && <p className="text-xs text-slate-500 max-w-xl">{item.details}</p>}
                </div>
                <Link
                  href={item.type === 'evenement' ? `/evenements/${item.id}` : '/dashboard/taches'}
                  className="bg-blue-900 hover:bg-blue-950 text-white font-bold px-4 py-2 rounded-xl text-xs text-center shrink-0"
                >
                  Accéder
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  };

  const getNavigationTitle = () => {
    if (view === 'month') {
      return currentDate.toLocaleString('fr-CA', { month: 'long', year: 'numeric' });
    } else if (view === 'week') {
      const days = getWeekDays();
      return `Semaine du ${days[0].getDate()} au ${days[6].getDate()} ${days[6].toLocaleString('fr-CA', { month: 'short', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950">Calendrier de l&apos;Association</h1>
          <p className="text-slate-650 text-sm">Visualisez toutes les activités, réunions (AG, CA) et échéances de tâches de l&apos;association.</p>
        </div>

        {/* View selection controls */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 self-start w-fit">
          <Button
            variant={view === 'day' ? 'default' : 'ghost'}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === 'day' ? 'bg-blue-900 text-white' : 'text-slate-600'}`}
            onClick={() => setView('day')}
          >
            Jour
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'ghost'}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === 'week' ? 'bg-blue-900 text-white' : 'text-slate-600'}`}
            onClick={() => setView('week')}
          >
            Semaine
          </Button>
          <Button
            variant={view === 'month' ? 'default' : 'ghost'}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === 'month' ? 'bg-blue-900 text-white' : 'text-slate-600'}`}
            onClick={() => setView('month')}
          >
            Mois
          </Button>
        </div>
      </div>

      {/* Navigation Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 border rounded-xl shadow-sm gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev} className="rounded-xl">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={setToday} className="rounded-xl text-xs font-bold px-3 py-1.5">
            Aujourd&apos;hui
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext} className="rounded-xl">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <span className="text-base font-bold text-slate-800 capitalize">
          {getNavigationTitle()}
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar View Container */}
        <div className="xl:col-span-3">
          {loading ? (
            <p className="text-center text-slate-400 py-12">Chargement du calendrier...</p>
          ) : view === 'month' ? (
            renderMonthView()
          ) : view === 'week' ? (
            renderWeekView()
          ) : (
            renderDayView()
          )}
        </div>

        {/* Legend & Agenda list */}
        <div className="xl:col-span-1 space-y-6">
          <Card className="border border-slate-100 shadow-md rounded-2xl bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold text-slate-450 uppercase tracking-wider">
                Légende
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-amber-100 border-l-4 border-amber-500" />
                <span className="font-semibold text-slate-700">Événements / Réunions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-emerald-100 border-l-4 border-emerald-500" />
                <span className="font-semibold text-slate-700">Échéance de tâches</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-100 shadow-md rounded-2xl bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold text-slate-455 uppercase tracking-wider">
                Activités ce mois
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-80 overflow-y-auto divide-y divide-slate-150">
              {loading ? (
                <p className="text-slate-400 text-center py-4 text-xs">Chargement...</p>
              ) : items.length === 0 ? (
                <p className="text-slate-450 text-center py-4 text-xs italic">Aucune activité prévue.</p>
              ) : (
                items.map(item => (
                  <div key={item.id} className="p-3 text-xs space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-800 line-clamp-1">{item.titre}</span>
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                        item.type === 'evenement' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3 text-blue-900" />
                        {item.date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                      </span>
                      {item.lieu && (
                        <span className="flex items-center gap-1 line-clamp-1">
                          <MapPin className="w-3 h-3 text-blue-900" />
                          {item.lieu}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
