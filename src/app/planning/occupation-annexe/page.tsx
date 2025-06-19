
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  parseISO as parseISODateFns,
  getMonth,
  getYear,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AddAnnexeEventModal, type AnnexeEventFormData } from '@/components/planning/add-annexe-event-modal';
import { getStoredAnnexeDefinitions, type AnnexeDefinition, ANNEXE_DEFINITIONS_STORAGE_KEY } from '@/app/administration/gestion-listes/annexes/page';


const ANNEXE_EVENTS_STORAGE_KEY = 'TRAPEL_FC_ANNEXE_EVENTS_DATA';

export interface AnnexeEvent {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  annexeId: string; // ID de l'AnnexeDefinition
  village: string; // Stocké pour affichage facile, mais annexeId est la référence
  lieu: string;    // Stocké pour affichage facile
  eventName: string;
}

const getAnnexeEventsFromStorage = (): AnnexeEvent[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(ANNEXE_EVENTS_STORAGE_KEY);
  if (storedData) {
    try {
      return JSON.parse(storedData) as AnnexeEvent[];
    } catch (error) {
      console.error("Error parsing annexe events from localStorage:", error);
      return [];
    }
  }
  return [];
};

const saveAnnexeEventsToStorage = (events: AnnexeEvent[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ANNEXE_EVENTS_STORAGE_KEY, JSON.stringify(events));
  window.dispatchEvent(new StorageEvent('storage', { key: ANNEXE_EVENTS_STORAGE_KEY }));
};

const getSeasonLabel = (currentMonthView: Date): string => {
  const currentMonth = getMonth(currentMonthView);
  const currentYear = getYear(currentMonthView);
  const seasonStartYear = currentMonth < 7 ? currentYear - 1 : currentYear; 
  return `Saison Août ${seasonStartYear} - Juillet ${seasonStartYear + 1}`;
};


export default function OccupationAnnexeAnnuelPage() {
  const [currentMonthView, setCurrentMonthView] = useState(() => startOfMonth(new Date()));
  const [annexeEvents, setAnnexeEvents] = useState<AnnexeEvent[]>([]);
  const [annexeDefinitions, setAnnexeDefinitions] = useState<AnnexeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Partial<AnnexeEventFormData> & { id?: string } | null>(null);
  const [defaultSlotData, setDefaultSlotData] = useState<Partial<AnnexeEventFormData> | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setAnnexeEvents(getAnnexeEventsFromStorage());
    setAnnexeDefinitions(getStoredAnnexeDefinitions());
    setIsLoading(false);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ANNEXE_EVENTS_STORAGE_KEY) {
        setAnnexeEvents(getAnnexeEventsFromStorage());
      }
      if (event.key === ANNEXE_DEFINITIONS_STORAGE_KEY) {
        setAnnexeDefinitions(getStoredAnnexeDefinitions());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  

  const handlePreviousMonth = () => {
    setCurrentMonthView(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthView(prev => addMonths(prev, 1));
  };


  const handleOpenAddModal = (date?: Date, existingEvent?: AnnexeEvent, annexeIdFromCell?: string) => {
    if (existingEvent) {
      setEventToEdit({
        ...existingEvent,
        date: parseISODateFns(existingEvent.date),
        annexeId: existingEvent.annexeId,
      });
      setDefaultSlotData(null);
    } else if (date) {
      setDefaultSlotData({
        date: date,
        startTime: "09:00",
        endTime: "10:00",
        annexeId: annexeIdFromCell || (annexeDefinitions.length > 0 ? annexeDefinitions[0].id : undefined),
      });
      setEventToEdit(null);
    } else { 
      setDefaultSlotData({
        date: currentMonthView, 
        startTime: "09:00",
        endTime: "10:00",
        annexeId: annexeDefinitions.length > 0 ? annexeDefinitions[0].id : undefined,
      });
      setEventToEdit(null);
    }
    setIsAddEventModalOpen(true);
  };

  const handleSaveEvent = (data: AnnexeEventFormData, isEditingEvent: boolean) => {
    const definition = annexeDefinitions.find(def => def.id === data.annexeId);
    if (!definition) {
        console.error("Annexe definition not found for ID:", data.annexeId);
        return; // ou afficher une erreur à l'utilisateur
    }

    let updatedEvents = [...annexeEvents];
    if (isEditingEvent && data.id) {
      updatedEvents = updatedEvents.map(event =>
        event.id === data.id ? { 
            ...event, 
            eventName: data.eventName,
            date: format(data.date, 'yyyy-MM-dd'),
            startTime: data.startTime,
            endTime: data.endTime,
            annexeId: data.annexeId!,
            village: definition.village,
            lieu: definition.lieu,
        } : event
      );
    } else {
      const newEvent: AnnexeEvent = {
        id: crypto.randomUUID(),
        eventName: data.eventName,
        date: format(data.date, 'yyyy-MM-dd'),
        startTime: data.startTime,
        endTime: data.endTime,
        annexeId: data.annexeId!,
        village: definition.village,
        lieu: definition.lieu,
      };
      updatedEvents.push(newEvent);
    }
    setAnnexeEvents(updatedEvents);
    saveAnnexeEventsToStorage(updatedEvents);
    setIsAddEventModalOpen(false);
    setEventToEdit(null);
    setDefaultSlotData(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    const updatedEvents = annexeEvents.filter(event => event.id !== eventId);
    setAnnexeEvents(updatedEvents);
    saveAnnexeEventsToStorage(updatedEvents);
    setIsAddEventModalOpen(false);
    setEventToEdit(null);
  };

  const monthGrid = useMemo(() => {
    const firstDay = startOfMonth(currentMonthView);
    const lastDay = endOfMonth(currentMonthView);
    const startDateGrid = startOfWeek(firstDay, { weekStartsOn: 1 }); 
    const endDateGrid = endOfWeek(lastDay, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: startDateGrid, end: endDateGrid });
    const grid: Date[][] = [];
    let week: Date[] = [];
    days.forEach((day, i) => {
      week.push(day);
      if ((i + 1) % 7 === 0) {
        grid.push(week);
        week = [];
      }
    });
    return grid;
  }, [currentMonthView]);

  const getEventsForDay = useCallback((day: Date): AnnexeEvent[] => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return annexeEvents
      .filter(event => event.date === dateStr)
      .sort((a, b) => {
        const timeA = parseInt(a.startTime.replace(':', ''), 10);
        const timeB = parseInt(b.startTime.replace(':', ''), 10);
        return timeA - timeB;
      });
  }, [annexeEvents]);

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement du planning des annexes...</div>;
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className='flex items-center'>
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/planning">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Retour au Module Planning</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Occupation des Annexes</h1>
        </div>
        <Button onClick={() => handleOpenAddModal(startOfMonth(currentMonthView))}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un événement
        </Button>
      </div>

      <div className="mb-6 flex items-center justify-between p-3 bg-muted rounded-md">
        <Button variant="outline" onClick={handlePreviousMonth} size="icon">
          <ChevronLeft className="h-5 w-5" /> <span className="sr-only">Mois précédent</span>
        </Button>
        <div className="text-center">
            <h2 className="text-xl font-semibold">
            {format(currentMonthView, 'MMMM yyyy', { locale: fr })}
            </h2>
            <p className="text-sm text-muted-foreground">{getSeasonLabel(currentMonthView)}</p>
        </div>
        <Button variant="outline" onClick={handleNextMonth} size="icon">
          <ChevronRight className="h-5 w-5" /> <span className="sr-only">Mois suivant</span>
        </Button>
      </div>

      <div className="grid grid-cols-7 border-t border-l border-border">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(dayName => (
          <div key={dayName} className="p-2 text-center font-medium border-r border-b border-border bg-muted/50 h-10 flex items-center justify-center">
            {dayName}
          </div>
        ))}
        {monthGrid.flat().map((day, index) => {
          const isCurrentMonthDay = isSameMonth(day, currentMonthView);
          const eventsOnDay = isCurrentMonthDay ? getEventsForDay(day) : [];
          return (
            <div
              key={index}
              className={cn(
                "p-1.5 border-r border-b border-border min-h-[120px] flex flex-col hover:bg-accent/30 transition-colors duration-150",
                !isCurrentMonthDay && "bg-muted/20 text-muted-foreground/50 cursor-not-allowed",
                isCurrentMonthDay && "cursor-pointer",
                isSameDay(day, new Date()) && isCurrentMonthDay && "bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500 z-10"
              )}
              onClick={() => isCurrentMonthDay && handleOpenAddModal(day)}
            >
              <span className={cn("font-medium mb-1 self-end text-xs", isCurrentMonthDay ? "text-foreground" : "text-muted-foreground/60")}>
                {format(day, 'd')}
              </span>
              {isCurrentMonthDay && (
                <div className="space-y-0.5 overflow-y-auto flex-1 text-[10px] leading-tight">
                  {eventsOnDay.map(event => (
                    <div
                      key={event.id}
                      className="p-1 bg-primary text-primary-foreground rounded-sm cursor-pointer hover:bg-primary/90 shadow"
                      onClick={(e) => { e.stopPropagation(); handleOpenAddModal(day, event); }}
                    >
                      <p className="font-semibold truncate text-[11px]">{event.eventName}</p>
                      <p className="truncate text-[9px] opacity-80">{event.village} - {event.lieu}</p>
                      <p className="text-[9px] opacity-80">{event.startTime} - {event.endTime}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AddAnnexeEventModal
        isOpen={isAddEventModalOpen}
        onClose={() => {
          setIsAddEventModalOpen(false);
          setEventToEdit(null);
          setDefaultSlotData(null);
        }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        initialData={eventToEdit || defaultSlotData || { date: currentMonthView } as Partial<AnnexeEventFormData>}
        isEditing={!!eventToEdit}
        annexeDefinitions={annexeDefinitions}
      />
    </div>
  );
}
