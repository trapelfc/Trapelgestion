
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight, PlusCircle, Trash2, Mail } from 'lucide-react'; // Added Mail
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  eachDayOfInterval,
  subDays,
  getDay,
  isSameDay,
  addWeeks,
  startOfDay,
  isBefore,
  isEqual,
  isWithinInterval,
  parseISO as parseISODateFns,
  getHours,
  getMinutes,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { AddPlanningEventModal, type PlanningEventFormData, planningEventFormSchema } from '@/components/planning/add-planning-event-modal';
import { EmailPlanningModal } from '@/components/planning/email-planning-modal'; // New import
import { getGeneratedCategoriesConfig, getActiveReferenceYear, type CategoryConfigItem, REFERENCE_YEAR_STORAGE_KEY, MANUAL_CATEGORY_DEFINITIONS_STORAGE_KEY, CATEGORY_COLORS_STORAGE_KEY } from '@/config/licencies-constants';

export interface PlannableUnit {
  headerName: string;
  id: string;
}

export interface FieldDefinition {
  name: string;
  units: PlannableUnit[];
  colspan: number;
  id: string;
}

export interface CommuneDefinition {
  name: string;
  fields: FieldDefinition[];
  colspan: number;
  id: string;
}

const STADES_CONFIG_STORAGE_KEY = 'TRAPEL_FC_STADES_CONFIG_DATA';

export const DEFAULT_STADES_CONFIG: CommuneDefinition[] = [
  {
    id: "commune_villemoustoussou",
    name: "Villemoustoussou",
    fields: [
      {
        id: "field_vm_honneur",
        name: "Terrain Honneur",
        units: [
          { headerName: "Zone Fond", id: "unit_vm_honneur_fond" },
          { headerName: "Zone terrain haut", id: "unit_vm_honneur_haut" },
        ],
        colspan: 2,
      },
      {
        id: "field_vm_haut",
        name: "Terrain du haut",
        units: [
          { headerName: "Terrain du haut", id: "unit_vm_terrain_haut_unite" },
        ],
        colspan: 1,
      },
    ],
    colspan: 3,
  },
  {
    id: "commune_pennautier",
    name: "Pennautier",
    fields: [
      {
        id: "field_pen_honneur",
        name: "Terrain Honneur",
        units: [
          { headerName: "Zone Gauche", id: "unit_pen_honneur_gauche" },
          { headerName: "Zone Maison", id: "unit_pen_honneur_maison" },
        ],
        colspan: 2
      },
      {
        id: "field_pen_stab",
        name: "Terrain stabilisé",
        units: [{ headerName: "Terrain stabilisé", id: "unit_pen_stabilise" }],
        colspan: 1
      },
    ],
    colspan: 3,
  },
  {
    id: "commune_villegailhenc",
    name: "Villegailhenc",
    fields: [
       {
        id: "field_ville_entrainement",
        name: "Terrain d'entrainement",
        units: [
          { headerName: "Zone Maison", id: "unit_ville_ent_maison" },
          { headerName: "Zone Riviere", id: "unit_ville_ent_riviere" },
        ],
        colspan: 2
      },
      {
        id: "field_ville_a8",
        name: "Terrain à 8",
        units: [
          { headerName: "Terrain à 8", id: "unit_ville_terrain_a_8" },
        ],
        colspan: 1,
      },
      {
        id: "field_ville_honneur_main_new",
        name: "Terrain Honneur",
        units: [
          { headerName: "Terrain Honneur", id: "unit_ville_honneur_main_new_unit" }
        ],
        colspan: 1,
      }
    ],
    colspan: 4,
  },
  {
    id: "commune_malves",
    name: "Malves",
    fields: [
      {
        id: "field_malves_honneur",
        name: "Terrain d'honneur",
        units: [
          { headerName: "Zone Entrée", id: "unit_malves_honneur_entree" },
          { headerName: "Zone Fond", id: "unit_malves_honneur_fond" },
        ],
        colspan: 2
      },
    ],
    colspan: 2,
  },
];
export { DEFAULT_STADES_CONFIG as DEFAULT_STADES_CONFIG_FALLBACK };


const getStadesConfigFromStorage = (): CommuneDefinition[] => {
  if (typeof window === 'undefined') return [...DEFAULT_STADES_CONFIG];
  const stored = localStorage.getItem(STADES_CONFIG_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as CommuneDefinition[];
      if (Array.isArray(parsed) && parsed.every(c => c.name && Array.isArray(c.fields) && c.id && typeof c.colspan === 'number')) {
         const isValidConfig = parsed.every(commune =>
          commune.fields.every(field =>
            field.name && Array.isArray(field.units) && field.id && typeof field.colspan === 'number' &&
            field.units.every(unit => unit.headerName && unit.id)
          )
        );
        if (isValidConfig) return parsed;
      }
    } catch (e) { console.error("Failed to parse stades config from localStorage", e); }
  }
  localStorage.setItem(STADES_CONFIG_STORAGE_KEY, JSON.stringify(DEFAULT_STADES_CONFIG));
  return [...DEFAULT_STADES_CONFIG];
};


const HEURE_FIN_PLANNING_ENTRAINEMENT_DEFAUT = 22;
const LARGEUR_COLONNE_JOUR = "80px";
const LARGEUR_COLONNE_HORAIRE = "100px";
const LARGEUR_COLONNE_STADE_UNITAIRE = "150px";

export interface PlanningEvent {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  stadeUnitId: string;
  categoryName: string;
  type: 'entrainement' | 'match';
  isRecurrent?: boolean;
  endDate?: string | null;
  recurrenceId?: string;
  recurrenceType?: 'weekly' | 'biweekly';
  typePlateauCriterium?: 'plateau' | 'criterium' | null;
  plateauCriteriumNumber?: number;
  matchId?: string;
}

const PLANNING_EVENTS_STORAGE_KEY = 'TRAPEL_FC_PLANNING_EVENTS_DATA';

const getPlanningEventsFromStorage = (): PlanningEvent[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(PLANNING_EVENTS_STORAGE_KEY);
  if (storedData) {
    try {
      return JSON.parse(storedData) as PlanningEvent[];
    } catch (error) {
      console.error("Error parsing planning events from localStorage:", error);
      return [];
    }
  }
  return [];
};

const savePlanningEventsToStorage = (events: PlanningEvent[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PLANNING_EVENTS_STORAGE_KEY, JSON.stringify(events));
  window.dispatchEvent(new StorageEvent('storage', { key: PLANNING_EVENTS_STORAGE_KEY }));
};

const timeStringToMinutes = (timeStr: string): number => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

interface EventSlotDetails {
  event: PlanningEvent;
  isStartingSlot: boolean;
  rowSpan: number;
}

const getAllActiveTimeSlotsForDay = (day: Date, events: PlanningEvent[], type: 'entrainement' | 'match'): string[] => {
  const slots = new Set<string>();
  const dayStr = format(day, 'yyyy-MM-dd');

  const eventsOnDay = events.filter(event => {
    if (event.date !== dayStr || event.type !== type) return false;
    return true;
  });

  if (type === 'entrainement') {
    const dayOfWeek = getDay(day);
    let defaultStartHour = (dayOfWeek === 3) ? 14 : 17;
    const defaultEndHour = HEURE_FIN_PLANNING_ENTRAINEMENT_DEFAUT;

    let actualStartHour = defaultStartHour;
    let actualEndHour = defaultEndHour;

    if (eventsOnDay.length > 0) {
        const eventStartTimesMinutes = eventsOnDay.map(e => timeStringToMinutes(e.startTime));
        const eventEndTimesMinutes = eventsOnDay.map(e => timeStringToMinutes(e.endTime));
        actualStartHour = Math.floor(Math.min(defaultStartHour * 60, ...eventStartTimesMinutes) / 60);
        actualEndHour = Math.ceil(Math.max(defaultEndHour * 60, ...eventEndTimesMinutes) / 60);
    }
    actualStartHour = Math.max(0, actualStartHour);
    actualEndHour = Math.min(24, actualEndHour);


    if (actualStartHour < actualEndHour) {
        for (let h = actualStartHour; h < actualEndHour; h++) {
            slots.add(`${String(h).padStart(2, '0')}:00`);
            slots.add(`${String(h).padStart(2, '0')}:30`);
        }
    }

  } else {
    eventsOnDay.forEach(event => {
      let currentMinutes = timeStringToMinutes(event.startTime);
      const endMinutes = timeStringToMinutes(event.endTime);

      while (currentMinutes < endMinutes) {
        const h = Math.floor(currentMinutes / 60);
        const m = currentMinutes % 60;
        slots.add(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        currentMinutes += 30;
      }
    });
  }
  return Array.from(slots).sort((a, b) => timeStringToMinutes(a) - timeStringToMinutes(b));
};


export default function OccupationStadesPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [isEmailPlanningModalOpen, setIsEmailPlanningModalOpen] = useState(false); // New state
  const [planningEvents, setPlanningEvents] = useState<PlanningEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'entrainement' | 'match'>('entrainement');

  const [stadesConfig, setStadesConfig] = useState<CommuneDefinition[]>([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);


  const allPlannableUnits = useMemo(() => {
    if (isLoadingConfig) return [];
    return stadesConfig.flatMap(commune => commune.fields.flatMap(field => field.units));
  }, [stadesConfig, isLoadingConfig]);

  const [eventToEdit, setEventToEdit] = useState<Partial<PlanningEventFormData> | null>(null);
  const [defaultSlotData, setDefaultSlotData] = useState<Partial<PlanningEventFormData> | null>(null);

  const [showSimpleDeleteDialog, setShowSimpleDeleteDialog] = useState(false);
  const [showRecurrentDeleteDialog, setShowRecurrentDeleteDialog] = useState(false);
  const [eventPendingDeletion, setEventPendingDeletion] = useState<{ id: string; recurrenceId?: string; date?: string; } | null>(null);

  const [categoriesWithColors, setCategoriesWithColors] = useState<CategoryConfigItem[]>([]);
  const [activeReferenceYear, setActiveRefYear] = useState(getActiveReferenceYear());


  useEffect(() => {
    setIsLoadingConfig(true);
    setStadesConfig(getStadesConfigFromStorage());
    setIsLoadingConfig(false);

    const currentRefYear = getActiveReferenceYear();
    setActiveRefYear(currentRefYear);
    setCategoriesWithColors(getGeneratedCategoriesConfig(currentRefYear));
    setPlanningEvents(getPlanningEventsFromStorage());


    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STADES_CONFIG_STORAGE_KEY) {
        setStadesConfig(getStadesConfigFromStorage());
      }
       if (event.key === PLANNING_EVENTS_STORAGE_KEY) {
        setPlanningEvents(getPlanningEventsFromStorage());
      }
      if (event.key === REFERENCE_YEAR_STORAGE_KEY ||
          event.key === MANUAL_CATEGORY_DEFINITIONS_STORAGE_KEY ||
          event.key === CATEGORY_COLORS_STORAGE_KEY) {
        const updatedRefYear = getActiveReferenceYear();
        setActiveRefYear(updatedRefYear);
        setCategoriesWithColors(getGeneratedCategoriesConfig(updatedRefYear));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);


  const stadeSelectOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    if (isLoadingConfig) return options;

    stadesConfig.forEach(commune => {
      commune.fields.forEach(field => {
        if (activeTab === 'match') {
          options.push({
            value: field.id,
            label: `${commune.name} - ${field.name} (Terrain Entier)`,
          });
        }
        field.units.forEach(unit => {
          options.push({
            value: unit.id,
            label: `${commune.name} - ${field.name} - ${unit.headerName}`,
          });
        });
      });
    });
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [stadesConfig, activeTab, isLoadingConfig]);

  const semaineAffichee = useMemo(() => {
    const debutSemainePourAffichage = startOfWeek(currentDate, { weekStartsOn: 1 });
    const finSemainePourAffichage = endOfWeek(currentDate, { weekStartsOn: 1 });
    const joursDansInterval = eachDayOfInterval({ start: debutSemainePourAffichage, end: finSemainePourAffichage });

    const joursFiltresEntrainement = joursDansInterval.filter(jour => {
      const dayOfWeek = getDay(jour);
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    });
    return { debut: debutSemainePourAffichage, fin: finSemainePourAffichage, joursEntrainement: joursFiltresEntrainement, joursMatchs: joursDansInterval };
  }, [currentDate]);


  const goToPreviousWeek = () => setCurrentDate(prevDate => subDays(prevDate, 7));
  const goToNextWeek = () => setCurrentDate(prevDate => addDays(prevDate, 7));

  const handleAddEventClick = () => {
    setEventToEdit(null);
    setDefaultSlotData({
      date: currentDate,
      startTime: "17:00",
      endTime: "17:30",
      recurrenceType: 'weekly',
      type: activeTab,
      typePlateauCriterium: null,
      plateauCriteriumNumber: undefined,
    });
    setIsAddEventModalOpen(true);
  };

  const handleOpenEmailModal = () => {
    setIsEmailPlanningModalOpen(true);
  };

  const handleCellClick = (day: Date, slotStartTime: string, unitId: string) => {
    const eventDetailsResult = getEventSlotDisplayInfo(day, slotStartTime, unitId, planningEvents.filter(e => e.type === activeTab));

    if (eventDetailsResult && eventDetailsResult.event) {
      const eventFormData: Partial<PlanningEventFormData> = {
        ...eventDetailsResult.event,
        date: parseISODateFns(eventDetailsResult.event.date),
        endDate: eventDetailsResult.event.endDate ? parseISODateFns(eventDetailsResult.event.endDate) : null,
        recurrenceType: eventDetailsResult.event.recurrenceType || (eventDetailsResult.event.isRecurrent ? 'weekly' : undefined),
        typePlateauCriterium: eventDetailsResult.event.typePlateauCriterium || null,
        plateauCriteriumNumber: eventDetailsResult.event.plateauCriteriumNumber,
      };
      setEventToEdit(eventFormData);
      setDefaultSlotData(null);
    } else {
      const startHour = parseInt(slotStartTime.split(':')[0]);
      const startMinute = parseInt(slotStartTime.split(':')[1]);
      const endSlotMinutes = startHour * 60 + startMinute + 30;
      const endHour = Math.floor(endSlotMinutes / 60);
      const endMinute = endSlotMinutes % 60;

      setDefaultSlotData({
        date: day,
        startTime: slotStartTime,
        endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
        stadeUnitId: unitId,
        recurrenceType: 'weekly',
        type: activeTab,
        typePlateauCriterium: null,
        plateauCriteriumNumber: undefined,
      });
      setEventToEdit(null);
    }
    setIsAddEventModalOpen(true);
  };

 const handleSaveEvent = (data: PlanningEventFormData, isCurrentlyEditing: boolean) => {
    let updatedEvents = [...planningEvents];
    const originalEventId = data.id || crypto.randomUUID();
    const baseRecurrenceId = data.recurrenceId || originalEventId;

    const createEventObject = (eventDate: Date, customId?: string, recIdToUse?: string, unitIdToUse?: string, matchIdToUseParam?: string): PlanningEvent => ({
      id: customId || crypto.randomUUID(),
      date: format(eventDate, 'yyyy-MM-dd'),
      startTime: data.startTime,
      endTime: data.endTime,
      stadeUnitId: unitIdToUse || data.stadeUnitId,
      categoryName: data.categoryName,
      type: data.type || activeTab,
      isRecurrent: data.isRecurrent,
      endDate: data.isRecurrent && data.endDate ? format(data.endDate, 'yyyy-MM-dd') : null,
      recurrenceId: data.isRecurrent ? recIdToUse : undefined,
      recurrenceType: data.isRecurrent ? data.recurrenceType : undefined,
      matchId: matchIdToUseParam,
      typePlateauCriterium: data.typePlateauCriterium,
      plateauCriteriumNumber: data.plateauCriteriumNumber,
    });

    if (isCurrentlyEditing && data.id) {
        const originalEvent = planningEvents.find(e => e.id === data.id);
        if (originalEvent?.isRecurrent && !data.isRecurrent && originalEvent.recurrenceId) {
             updatedEvents = updatedEvents.filter(e => e.recurrenceId !== originalEvent.recurrenceId);
        } else if (data.isRecurrent && originalEvent?.recurrenceId && !data.id?.startsWith('temp_')) {
             updatedEvents = updatedEvents.filter(e => e.recurrenceId !== originalEvent.recurrenceId);
        } else if (originalEvent?.matchId) {
            if (originalEvent.recurrenceId) {
                 updatedEvents = updatedEvents.filter(e => !(e.matchId === originalEvent.matchId && e.recurrenceId === originalEvent.recurrenceId));
            } else {
                 updatedEvents = updatedEvents.filter(e => !(e.matchId === originalEvent.matchId && e.date === originalEvent.date));
            }
        }
         else {
            updatedEvents = updatedEvents.filter(e => e.id !== data.id);
        }
    }

    const newEventsBase: PlanningEvent[] = [];
    const selectedStadeUnitOrField = allPlannableUnits.find(u => u.id === data.stadeUnitId) || stadesConfig.flatMap(c => c.fields).find(f => f.id === data.stadeUnitId);
    const isFieldBooking = data.type === 'match' && selectedStadeUnitOrField && 'units' in selectedStadeUnitOrField && Array.isArray(selectedStadeUnitOrField.units);

    if (isFieldBooking && selectedStadeUnitOrField && 'units' in selectedStadeUnitOrField) {
      const fieldDefinition = selectedStadeUnitOrField as FieldDefinition;
      const matchIdForThisBooking = data.matchId || crypto.randomUUID();
      if (data.isRecurrent && data.endDate) {
        let iterDate = startOfDay(data.date);
        const finalRecurrenceEndDate = startOfDay(data.endDate);
        const originalDayOfWeek = getDay(data.date);

        while (isBefore(iterDate, finalRecurrenceEndDate) || isEqual(iterDate, finalRecurrenceEndDate)) {
          if (getDay(iterDate) === originalDayOfWeek) {
            fieldDefinition.units.forEach(unit => {
              newEventsBase.push(createEventObject(iterDate, crypto.randomUUID(), baseRecurrenceId, unit.id, matchIdForThisBooking));
            });
          }
          iterDate = addWeeks(iterDate, data.recurrenceType === 'biweekly' ? 2 : 1);
        }
      } else {
        fieldDefinition.units.forEach(unit => {
          newEventsBase.push(createEventObject(data.date, crypto.randomUUID(), undefined, unit.id, matchIdForThisBooking));
        });
      }
    } else {
      if (data.isRecurrent && data.endDate) {
        let iterDate = startOfDay(data.date);
        const finalRecurrenceEndDate = startOfDay(data.endDate);
        const originalDayOfWeek = getDay(data.date);

        while (isBefore(iterDate, finalRecurrenceEndDate) || isEqual(iterDate, finalRecurrenceEndDate)) {
          if (getDay(iterDate) === originalDayOfWeek) {
            const currentEventId = isEqual(iterDate, startOfDay(data.date)) && isCurrentlyEditing ? originalEventId : crypto.randomUUID();
             newEventsBase.push(createEventObject(iterDate, currentEventId, baseRecurrenceId, data.stadeUnitId, data.type === 'match' ? (data.matchId || crypto.randomUUID()) : undefined ));
          }
          iterDate = addWeeks(iterDate, data.recurrenceType === 'biweekly' ? 2 : 1);
        }
      } else {
         newEventsBase.push(createEventObject(data.date, originalEventId, data.isRecurrent ? baseRecurrenceId : undefined, data.stadeUnitId, data.type === 'match' ? (data.matchId || crypto.randomUUID()) : undefined ));
      }
    }

    updatedEvents = [...updatedEvents, ...newEventsBase];

    const uniqueEvents = updatedEvents.reduce((acc, current) => {
      if (!acc.find(item => item.id === current.id)) {
        acc.push(current);
      }
      return acc;
    }, [] as PlanningEvent[]);

    setPlanningEvents(uniqueEvents);
    savePlanningEventsToStorage(uniqueEvents);
    setIsAddEventModalOpen(false);
    setEventToEdit(null);
    setDefaultSlotData(null);
  };

  const handleRequestDeleteEvent = (eventId: string, recurrenceId?: string, eventDateISO?: string) => {
    setEventPendingDeletion({ id: eventId, recurrenceId, date: eventDateISO });
    const eventToDelete = planningEvents.find(e => e.id === eventId);
    const hasMultipleInstancesInSeries = recurrenceId && planningEvents.filter(e => e.recurrenceId === recurrenceId).length > 1;

    const isMatchBookingOnDate = eventToDelete?.matchId && planningEvents.filter(e => e.matchId === eventToDelete.matchId && e.date === eventToDelete.date).length > 1;
    const isRecurrentMatchBookingInSeries = eventToDelete?.matchId && eventToDelete.recurrenceId && planningEvents.filter(e => e.matchId === eventToDelete.matchId && e.recurrenceId === eventToDelete.recurrenceId).length > 1;

    if (isMatchBookingOnDate || isRecurrentMatchBookingInSeries || (recurrenceId && hasMultipleInstancesInSeries && !eventToDelete?.matchId)) {
      setShowRecurrentDeleteDialog(true);
    } else {
      setShowSimpleDeleteDialog(true);
    }
  };

  const executeDeleteEvent = (scope: 'single' | 'all_in_series' | 'all_match_instances_on_date' | 'all_match_instances_in_series') => {
    if (!eventPendingDeletion) return;

    let updatedEvents = [...planningEvents];
    const eventMeta = planningEvents.find(e => e.id === eventPendingDeletion.id);

    if (scope === 'single') {
        updatedEvents = updatedEvents.filter(event => event.id !== eventPendingDeletion.id);
    } else if (scope === 'all_match_instances_on_date' && eventMeta?.matchId && eventMeta.date) {
        updatedEvents = updatedEvents.filter(event => !(event.matchId === eventMeta.matchId && event.date === eventMeta.date));
    } else if (scope === 'all_match_instances_in_series' && eventMeta?.matchId && eventMeta.recurrenceId) {
        updatedEvents = updatedEvents.filter(event => !(event.matchId === eventMeta.matchId && event.recurrenceId === eventMeta.recurrenceId));
    } else if (scope === 'all_in_series' && eventPendingDeletion.recurrenceId) {
        if (eventMeta?.matchId) {
             updatedEvents = updatedEvents.filter(event => !(event.matchId === eventMeta.matchId && event.recurrenceId === eventPendingDeletion.recurrenceId));
        } else {
            updatedEvents = updatedEvents.filter(event => event.recurrenceId !== eventPendingDeletion.recurrenceId);
        }
    } else if (scope === 'all_in_series' && eventMeta?.matchId && !eventMeta.recurrenceId) {
        updatedEvents = updatedEvents.filter(event => !(event.matchId === eventMeta.matchId && event.date === eventMeta.date));
    }


    setPlanningEvents(updatedEvents);
    savePlanningEventsToStorage(updatedEvents);
    closeDeleteDialogs();
  };

  const closeDeleteDialogs = () => {
    setShowSimpleDeleteDialog(false);
    setShowRecurrentDeleteDialog(false);
    setEventPendingDeletion(null);
  };

  const getEventSlotDisplayInfo = useCallback((
    day: Date,
    slotStartTimeStr: string,
    unitId: string,
    allEvents: PlanningEvent[]
  ): EventSlotDetails | null => {
    const slotDateStr = format(day, 'yyyy-MM-dd');
    const currentSlotStartMinutes = timeStringToMinutes(slotStartTimeStr);

    for (const event of allEvents) {
      if (event.date !== slotDateStr || event.stadeUnitId !== unitId) {
        continue;
      }

      const eventStartMinutes = timeStringToMinutes(event.startTime);
      const eventEndMinutes = timeStringToMinutes(event.endTime);

      if (currentSlotStartMinutes >= eventStartMinutes && currentSlotStartMinutes < eventEndMinutes) {
        const isStartingSlot = eventStartMinutes === currentSlotStartMinutes;
        let rowSpan = 0;
        if (isStartingSlot) {
          let tempCurrentMinutes = eventStartMinutes;
          while (tempCurrentMinutes < eventEndMinutes) {
            rowSpan++;
            tempCurrentMinutes += 30;
          }
        }
        return { event, isStartingSlot, rowSpan };
      }
    }
    return null;
  }, []);


  const filteredPlanningEvents = useMemo(() => {
    return planningEvents.filter(event => {
        if (event.type !== activeTab) return false;
        return true;
    });
  }, [planningEvents, activeTab]);


  const getEventDisplayDetails = (event: PlanningEvent) => {
    const categoryConfig = categoriesWithColors.find(c => c.id === event.categoryName);
    const bgColor = categoryConfig?.color || 'hsl(var(--primary))';

    let textColor = 'hsl(var(--primary-foreground))';
    if (bgColor.startsWith('#')) {
        const r = parseInt(bgColor.substring(1, 3), 16);
        const g = parseInt(bgColor.substring(3, 5), 16);
        const b = parseInt(bgColor.substring(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        if (luminance > 0.5) {
            textColor = 'hsl(var(--foreground))';
        }
    } else if (bgColor.startsWith('hsl')) {
        const match = bgColor.match(/hsl\(\s*\d+\s+\d+%\s+(\d+)%\s*\)/);
        if (match && parseInt(match[1]) > 50) {
             textColor = 'hsl(var(--foreground))';
        }
    }

    return {
      bgColor,
      textColor,
      label: event.categoryName,
    };
  };


 const renderEntrainementTable = () => {
    let weekHasAnySlots = false;

    const tableRows = semaineAffichee.joursEntrainement.flatMap((jour, jourIndexSemaine) => {
      const dayOfWeek = getDay(jour);
      let defaultStartHour = (dayOfWeek === 3) ? 14 : 17;
      const defaultEndHour = HEURE_FIN_PLANNING_ENTRAINEMENT_DEFAUT;

      const eventsOnDay = filteredPlanningEvents.filter(e => isSameDay(jour, parseISODateFns(e.date)) && e.type === 'entrainement');

      let actualStartHour = defaultStartHour;
      let actualEndHour = defaultEndHour;

      if (eventsOnDay.length > 0) {
        const eventStartTimesMinutes = eventsOnDay.map(e => timeStringToMinutes(e.startTime));
        const eventEndTimesMinutes = eventsOnDay.map(e => timeStringToMinutes(e.endTime));

        actualStartHour = Math.floor(Math.min(defaultStartHour * 60, ...eventStartTimesMinutes) / 60);
        actualEndHour = Math.ceil(Math.max(defaultEndHour * 60, ...eventEndTimesMinutes) / 60);
      }
      actualStartHour = Math.max(0, actualStartHour);
      actualEndHour = Math.min(24, actualEndHour);


      const heuresPleinesPourJour = [];
      for (let h = actualStartHour; h < actualEndHour; h++) {
        heuresPleinesPourJour.push(h);
      }

      if (heuresPleinesPourJour.length > 0) {
        weekHasAnySlots = true;
      } else {
        return [];
      }

      const totalDemiHeuresPourJour = heuresPleinesPourJour.length * 2;

      return heuresPleinesPourJour.flatMap((heurePleine, indexHeurePleine) => {
        const slot1StartTime = `${String(heurePleine).padStart(2, '0')}:00`;
        const slot2StartTime = `${String(heurePleine).padStart(2, '0')}:30`;
        const isLastFullHourOfDay = indexHeurePleine === heuresPleinesPourJour.length - 1;

        const cellsForFirstHalf = allPlannableUnits.map((unit, unitGlobalIndex) => {
          const eventInfo = getEventSlotDisplayInfo(jour, slot1StartTime, unit.id, filteredPlanningEvents);
          const isLastUnitOfCommuneOverall = (unitGlobalIndex === allPlannableUnits.length - 1) ||
            !stadesConfig.some(c => c.fields.some(f => f.units.some(u => u.id === allPlannableUnits[unitGlobalIndex + 1]?.id) && c.fields.some(f2 => f2.units.some(u2 => u2.id === unit.id) && c.id === stadesConfig.find(c2 => c2.fields.some(f3 => f3.units.some(u3 => u3.id === allPlannableUnits[unitGlobalIndex + 1]?.id)))?.id)));

          if (eventInfo && eventInfo.isStartingSlot) {
            const displayDetails = getEventDisplayDetails(eventInfo.event);
            return (
              <TableCell
                key={`${unit.id}-${slot1StartTime}`}
                rowSpan={eventInfo.rowSpan}
                className={cn(
                  "p-0 text-center align-middle text-xs relative cursor-pointer",
                  "border-l border-r",
                  isLastUnitOfCommuneOverall && "border-r-2 border-border",
                  !isLastUnitOfCommuneOverall && !allPlannableUnits[unitGlobalIndex+1]?.id.startsWith(unit.id.substring(0, unit.id.lastIndexOf('_'))) && "border-r-2 border-border"
                )}
                style={{ backgroundColor: displayDetails.bgColor, minHeight: `${eventInfo.rowSpan * 50}px` }}
                onClick={() => handleCellClick(jour, slot1StartTime, unit.id)}
              >
                <div className={cn("h-full w-full flex flex-col items-center justify-center text-center leading-tight p-1")} style={{ color: displayDetails.textColor }}>
                  <span className="text-[10px] font-semibold">{eventInfo.event.typePlateauCriterium === 'plateau' ? 'Plateau - ' : eventInfo.event.typePlateauCriterium === 'criterium' ? 'Critérium - ' : ''}{displayDetails.label}</span>
                  {eventInfo.event.plateauCriteriumNumber !== undefined && eventInfo.event.plateauCriteriumNumber > 0 && (
                    <span className="block text-[10px]">{eventInfo.event.plateauCriteriumNumber} équipes</span>
                  )}
                  <span className="block text-[10px]">
                    {eventInfo.event.startTime} - {eventInfo.event.endTime}
                  </span>
                </div>
              </TableCell>
            );
          } else if (eventInfo && !eventInfo.isStartingSlot) {
            return null;
          } else {
            return (
              <TableCell
                key={`${unit.id}-${slot1StartTime}`}
                onClick={() => handleCellClick(jour, slot1StartTime, unit.id)}
                className={cn(
                  "p-0 text-center align-middle min-h-[50px] text-xs relative cursor-pointer hover:bg-accent/50",
                  "border-l border-r border-b-0",
                  isLastUnitOfCommuneOverall && "border-r-2 border-border",
                  !isLastUnitOfCommuneOverall && !allPlannableUnits[unitGlobalIndex+1]?.id.startsWith(unit.id.substring(0, unit.id.lastIndexOf('_'))) && "border-r-2 border-border"
                )}
              >
                &nbsp;
              </TableCell>
            );
          }
        });

        const cellsForSecondHalf = allPlannableUnits.map((unit, unitGlobalIndex) => {
          const eventInfoFirstHalf = getEventSlotDisplayInfo(jour, slot1StartTime, unit.id, filteredPlanningEvents);
          if (eventInfoFirstHalf && eventInfoFirstHalf.isStartingSlot && eventInfoFirstHalf.rowSpan > 1) {
            return null;
          }
          const isLastUnitOfCommuneOverall = (unitGlobalIndex === allPlannableUnits.length - 1) ||
            !stadesConfig.some(c => c.fields.some(f => f.units.some(u => u.id === allPlannableUnits[unitGlobalIndex + 1]?.id) && c.fields.some(f2 => f2.units.some(u2 => u2.id === unit.id) && c.id === stadesConfig.find(c2 => c2.fields.some(f3 => f3.units.some(u3 => u3.id === allPlannableUnits[unitGlobalIndex + 1]?.id)))?.id)));


          const eventInfoSecondHalf = getEventSlotDisplayInfo(jour, slot2StartTime, unit.id, filteredPlanningEvents);
          if (eventInfoSecondHalf && eventInfoSecondHalf.isStartingSlot) {
             const displayDetails = getEventDisplayDetails(eventInfoSecondHalf.event);
            return (
              <TableCell
                key={`${unit.id}-${slot2StartTime}`}
                rowSpan={eventInfoSecondHalf.rowSpan}
                className={cn(
                  "p-0 text-center align-middle text-xs relative cursor-pointer",
                  "border-l border-r border-b",
                  (isLastFullHourOfDay && (jourIndexSemaine < semaineAffichee.joursEntrainement.length -1 )) && "border-b-2 border-border",
                  isLastUnitOfCommuneOverall && "border-r-2 border-border",
                  !isLastUnitOfCommuneOverall && !allPlannableUnits[unitGlobalIndex+1]?.id.startsWith(unit.id.substring(0, unit.id.lastIndexOf('_'))) && "border-r-2 border-border"
                )}
                 style={{ backgroundColor: displayDetails.bgColor, minHeight: `${eventInfoSecondHalf.rowSpan * 50}px` }}
                onClick={() => handleCellClick(jour, slot2StartTime, unit.id)}
              >
                 <div className={cn("h-full w-full flex flex-col items-center justify-center text-center leading-tight p-1")} style={{ color: displayDetails.textColor }}>
                  <span className="text-[10px] font-semibold">{eventInfoSecondHalf.event.typePlateauCriterium === 'plateau' ? 'Plateau - ' : eventInfoSecondHalf.event.typePlateauCriterium === 'criterium' ? 'Critérium - ' : ''}{displayDetails.label}</span>
                   {eventInfoSecondHalf.event.plateauCriteriumNumber !== undefined && eventInfoSecondHalf.event.plateauCriteriumNumber > 0 && (
                    <span className="block text-[10px]">{eventInfoSecondHalf.event.plateauCriteriumNumber} équipes</span>
                  )}
                  <span className="block text-[10px]">{eventInfoSecondHalf.event.startTime} - {eventInfoSecondHalf.event.endTime}</span>
                </div>
              </TableCell>
            );
          } else if (eventInfoSecondHalf && !eventInfoSecondHalf.isStartingSlot) {
             return null;
          } else {
            return (
              <TableCell
                key={`${unit.id}-${slot2StartTime}`}
                onClick={() => handleCellClick(jour, slot2StartTime, unit.id)}
                className={cn(
                  "p-0 text-center align-middle min-h-[50px] text-xs relative cursor-pointer hover:bg-accent/50 border-b",
                  (isLastFullHourOfDay && (jourIndexSemaine < semaineAffichee.joursEntrainement.length -1 )) && "border-b-2 border-border",
                  "border-l border-r",
                  isLastUnitOfCommuneOverall && "border-r-2 border-border",
                  !isLastUnitOfCommuneOverall && !allPlannableUnits[unitGlobalIndex+1]?.id.startsWith(unit.id.substring(0, unit.id.lastIndexOf('_'))) && "border-r-2 border-border"
                )}
              >
                &nbsp;
              </TableCell>
            );
          }
        });

        return [
          <TableRow
            key={`${format(jour, 'yyyy-MM-dd')}-${heurePleine}-00`}
            className="border-b-0"
          >
            {indexHeurePleine === 0 && (
              <TableCell
                rowSpan={totalDemiHeuresPourJour}
                className="sticky left-0 z-30 bg-background font-medium py-1 px-3 whitespace-nowrap border-r-2 border-border text-center align-middle"
                style={{ minWidth: LARGEUR_COLONNE_JOUR, width: LARGEUR_COLONNE_JOUR }}
              >
                {format(jour, 'EEEE', { locale: fr })}
              </TableCell>
            )}
            <TableCell
              rowSpan={2}
              className="sticky z-20 bg-background py-1 px-3 whitespace-nowrap border-r-2 border-border text-xs text-muted-foreground text-center align-middle"
              style={{ left: LARGEUR_COLONNE_JOUR, minWidth: LARGEUR_COLONNE_HORAIRE, width: LARGEUR_COLONNE_HORAIRE }}
            >
              {`${String(heurePleine).padStart(2, '0')}:00 - ${String(heurePleine + 1).padStart(2, '0')}:00`}
            </TableCell>
            {cellsForFirstHalf.filter(Boolean)}
          </TableRow>,
          <TableRow
            key={`${format(jour, 'yyyy-MM-dd')}-${heurePleine}-30`}
            className={cn("border-b", (isLastFullHourOfDay && (jourIndexSemaine < semaineAffichee.joursEntrainement.length -1 )) && "border-b-2 border-border")}
          >
            {cellsForSecondHalf.filter(Boolean)}
          </TableRow>
        ];
      });
    });

    if (!weekHasAnySlots && activeTab === 'entrainement') {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={2 + allPlannableUnits.length} className="text-center text-muted-foreground py-8">
              Aucun créneau d'entraînement (par défaut ou planifié) pour cette semaine.
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }
    return <TableBody>{tableRows.filter(Boolean)}</TableBody>;
  };


  const renderMatchTable = () => {
    const joursAvecMatchs = semaineAffichee.joursMatchs.filter(jour =>
      getAllActiveTimeSlotsForDay(jour, filteredPlanningEvents, 'match').length > 0
    );

    if (joursAvecMatchs.length === 0 && activeTab === 'match') {
        return (
            <TableBody>
                <TableRow>
                    <TableCell colSpan={2 + allPlannableUnits.length} className="text-center text-muted-foreground py-8">
                    Aucun match prévu pour cette semaine.
                    </TableCell>
                </TableRow>
            </TableBody>
        );
    }

    return (
      <TableBody>
        {joursAvecMatchs.map((jour, jourIndexTableau) => {
          const activeTimeSlotsToday = getAllActiveTimeSlotsForDay(jour, filteredPlanningEvents, 'match');
          if (activeTimeSlotsToday.length === 0) return null;

          return activeTimeSlotsToday.map((slotStartTimeStr, slotIndex) => {
            const slotEndTime = new Date(new Date(`2000-01-01T${slotStartTimeStr}`).getTime() + 30 * 60000);
            const slotEndTimeStr = format(slotEndTime, 'HH:mm');
            const isLastSlotOfDay = slotIndex === activeTimeSlotsToday.length - 1;
            const isLastDayInTable = jourIndexTableau === joursAvecMatchs.length - 1;

            return (
              <TableRow key={`${format(jour, 'yyyy-MM-dd')}-${slotStartTimeStr}`}
                className={cn("border-b", (isLastSlotOfDay && !isLastDayInTable) && "border-b-2 border-border")}
              >
                {slotIndex === 0 && (
                  <TableCell
                    rowSpan={activeTimeSlotsToday.length}
                    className="sticky left-0 z-30 bg-background font-medium py-1 px-3 whitespace-nowrap border-r-2 border-border text-center align-middle"
                    style={{ minWidth: LARGEUR_COLONNE_JOUR, width: LARGEUR_COLONNE_JOUR }}
                  >
                    {format(jour, 'EEEE', { locale: fr })}
                    <span className="block text-xs text-muted-foreground">{format(jour, 'dd/MM')}</span>
                  </TableCell>
                )}
                <TableCell
                  className="sticky z-20 bg-background py-1 px-3 whitespace-nowrap border-r-2 border-border text-xs text-muted-foreground text-center align-middle"
                  style={{ left: LARGEUR_COLONNE_JOUR, minWidth: LARGEUR_COLONNE_HORAIRE, width: LARGEUR_COLONNE_HORAIRE }}
                >
                  {`${slotStartTimeStr} - ${slotEndTimeStr}`}
                </TableCell>
                {allPlannableUnits.map((unit, unitGlobalIndex) => {
                  const eventInfo = getEventSlotDisplayInfo(jour, slotStartTimeStr, unit.id, filteredPlanningEvents);
                   const isLastUnitOfCommuneOverall = (unitGlobalIndex === allPlannableUnits.length - 1) ||
                    !stadesConfig.some(c => c.fields.some(f => f.units.some(u => u.id === allPlannableUnits[unitGlobalIndex + 1]?.id) && c.fields.some(f2 => f2.units.some(u2 => u2.id === unit.id) && c.id === stadesConfig.find(c2 => c2.fields.some(f3 => f3.units.some(u3 => u3.id === allPlannableUnits[unitGlobalIndex + 1]?.id)))?.id)));

                  if (eventInfo && eventInfo.isStartingSlot) {
                    const displayDetails = getEventDisplayDetails(eventInfo.event);
                    return (
                      <TableCell
                        key={`${unit.id}-${slotStartTimeStr}`}
                        rowSpan={eventInfo.rowSpan}
                        className={cn(
                          "p-0 text-center align-middle text-xs relative cursor-pointer",
                          "border-l border-r",
                           isLastUnitOfCommuneOverall && "border-r-2 border-border",
                           !isLastUnitOfCommuneOverall && !allPlannableUnits[unitGlobalIndex+1]?.id.startsWith(unit.id.substring(0, unit.id.lastIndexOf('_'))) && "border-r-2 border-border",
                           (isLastSlotOfDay && !isLastDayInTable && eventInfo.rowSpan === 1 ) && "border-b-2 border-border"
                        )}
                        style={{ backgroundColor: displayDetails.bgColor, minHeight: `${eventInfo.rowSpan * 50}px` }}
                        onClick={() => handleCellClick(jour, slotStartTimeStr, unit.id)}
                      >
                        <div className={cn("h-full w-full flex flex-col items-center justify-center text-center leading-tight p-1")} style={{ color: displayDetails.textColor }}>
                         <span className="text-[10px] font-semibold">{eventInfo.event.typePlateauCriterium === 'plateau' ? 'Plateau - ' : eventInfo.event.typePlateauCriterium === 'criterium' ? 'Critérium - ' : ''}{displayDetails.label}</span>
                         {eventInfo.event.plateauCriteriumNumber !== undefined && eventInfo.event.plateauCriteriumNumber > 0 && (
                            <span className="block text-[10px]">{eventInfo.event.plateauCriteriumNumber} équipes</span>
                          )}
                         <span className="block text-[10px]">
                            {eventInfo.event.startTime} - {eventInfo.event.endTime}
                          </span>
                        </div>
                      </TableCell>
                    );
                  } else if (eventInfo && !eventInfo.isStartingSlot) {
                    return null;
                  } else {
                    return (
                      <TableCell
                        key={`${unit.id}-${slotStartTimeStr}`}
                        onClick={() => handleCellClick(jour, slotStartTimeStr, unit.id)}
                        className={cn(
                          "p-0 text-center align-middle min-h-[50px] text-xs relative cursor-pointer hover:bg-accent/50",
                           "border-l border-r border-b",
                           (isLastSlotOfDay && !isLastDayInTable) && "border-b-2 border-border",
                           isLastUnitOfCommuneOverall && "border-r-2 border-border",
                           !isLastUnitOfCommuneOverall && !allPlannableUnits[unitGlobalIndex+1]?.id.startsWith(unit.id.substring(0, unit.id.lastIndexOf('_'))) && "border-r-2 border-border",
                        )}
                      >
                        &nbsp;
                      </TableCell>
                    );
                  }
                })}
              </TableRow>
            );
          });
        })}
      </TableBody>
    );
  };

  if (isLoadingConfig) {
     return (
      <div className="container mx-auto p-4 text-center">
        Chargement de la configuration des stades...
      </div>
    );
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
          <h1 className="text-2xl font-bold">Occupation des Stades</h1>
        </div>
        <div className="flex items-center space-x-2">
            <Button onClick={handleOpenEmailModal} variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                Exporter/Envoyer Planning
            </Button>
            <Button onClick={handleAddEventClick}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter un créneau
            </Button>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <Button variant="outline" onClick={goToPreviousWeek} size="icon">
          <ChevronLeft className="h-5 w-5" />
          <span className="sr-only">Semaine précédente</span>
        </Button>
        <h2 className="text-xl font-semibold text-center">
          Semaine du {format(semaineAffichee.debut, 'dd MMMM yyyy', { locale: fr })} au {format(semaineAffichee.fin, 'dd MMMM yyyy', { locale: fr })}
        </h2>
        <Button variant="outline" onClick={goToNextWeek} size="icon">
          <ChevronRight className="h-5 w-5" />
          <span className="sr-only">Semaine suivante</span>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'entrainement' | 'match')} className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="entrainement">Entraînements</TabsTrigger>
          <TabsTrigger value="match">Matchs</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-md border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader className="border-b-2 border-border">
            <TableRow>
              <TableHead
                rowSpan={3}
                className="sticky left-0 z-30 bg-background py-1 px-2 h-9 whitespace-nowrap border-r-2 border-border text-center align-middle"
                style={{ minWidth: LARGEUR_COLONNE_JOUR, width: LARGEUR_COLONNE_JOUR }}
              >
                Jour
              </TableHead>
              <TableHead
                rowSpan={3}
                className="sticky z-20 bg-background py-1 px-2 h-9 whitespace-nowrap border-r-2 border-border text-center align-middle"
                style={{ left: LARGEUR_COLONNE_JOUR, minWidth: LARGEUR_COLONNE_HORAIRE, width: LARGEUR_COLONNE_HORAIRE }}
              >
                Horaire
              </TableHead>
              {stadesConfig.map((commune, communeIndex) => (
                <TableHead
                  key={commune.id}
                  colSpan={commune.colspan}
                  className={cn(
                    "py-1 px-2 h-9 text-center whitespace-nowrap border-t border-l border-b align-middle",
                     (communeIndex < stadesConfig.length -1) ? "border-r-2 border-border" : "border-r"
                  )}
                >
                  {commune.name}
                </TableHead>
              ))}
            </TableRow>
            <TableRow>
              {stadesConfig.flatMap((commune, communeIndex) =>
                commune.fields.map((field, fieldIndex) => (
                  <TableHead
                    key={field.id}
                    colSpan={field.colspan}
                    rowSpan={field.units.length === 1 ? 2 : 1}
                    className={cn(
                      "py-1 px-2 h-9 text-center whitespace-nowrap border-l border-b align-middle",
                      (field.units.length === 1) && "align-middle",
                      (fieldIndex === commune.fields.length - 1 && communeIndex < stadesConfig.length -1) ? "border-r-2 border-border" :
                      (fieldIndex === commune.fields.length - 1 && communeIndex === stadesConfig.length -1) ? "border-r" : "border-r"
                    )}
                  >
                    {field.name}
                  </TableHead>
                ))
              )}
            </TableRow>
            <TableRow>
              {stadesConfig.flatMap((commune, communeIndex) =>
                commune.fields.flatMap((field, fieldIndex) => {
                  if (field.units.length === 1) return null;
                  return field.units.map((unit, unitIndex) => (
                    <TableHead
                      key={unit.id}
                      className={cn(
                        "py-1 px-2 h-9 text-center whitespace-nowrap border-l border-b",
                        (unitIndex === field.units.length - 1 && fieldIndex === commune.fields.length - 1 && communeIndex < stadesConfig.length -1) ? "border-r-2 border-border" :
                        (unitIndex === field.units.length - 1 && fieldIndex === commune.fields.length - 1 && communeIndex === stadesConfig.length -1) ? "border-r" : "border-r"
                      )}
                      style={{ minWidth: LARGEUR_COLONNE_STADE_UNITAIRE }}
                    >
                      {unit.headerName}
                    </TableHead>
                  ));
                })
              ).filter(Boolean)}
            </TableRow>
          </TableHeader>
          {activeTab === 'entrainement' ? renderEntrainementTable() : renderMatchTable()}
        </Table>
      </div>
      <AddPlanningEventModal
        isOpen={isAddEventModalOpen}
        onClose={() => {
          setIsAddEventModalOpen(false);
          setEventToEdit(null);
          setDefaultSlotData(null);
        }}
        onSave={handleSaveEvent}
        onDelete={handleRequestDeleteEvent}
        stadeOptions={stadeSelectOptions}
        initialData={eventToEdit || defaultSlotData || { date: currentDate, recurrenceType: 'weekly', type: activeTab, typePlateauCriterium: null, plateauCriteriumNumber: undefined } as Partial<PlanningEventFormData>}
        isEditing={!!eventToEdit}
      />

      <EmailPlanningModal
        isOpen={isEmailPlanningModalOpen}
        onClose={() => setIsEmailPlanningModalOpen(false)}
        allPlanningEvents={planningEvents}
        stadesConfig={stadesConfig}
        currentWeekStart={semaineAffichee.debut}
        currentWeekEnd={semaineAffichee.fin}
        categoriesWithColors={categoriesWithColors}
      />

      {eventPendingDeletion && (
        <>
          <AlertDialog open={showSimpleDeleteDialog} onOpenChange={setShowSimpleDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription>
                  Voulez-vous vraiment supprimer ce créneau ?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={closeDeleteDialogs}>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => executeDeleteEvent('single')} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={showRecurrentDeleteDialog} onOpenChange={setShowRecurrentDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer l'événement</AlertDialogTitle>
                <AlertDialogDescription>
                  Cet événement fait partie d'une série ou d'une réservation de terrain. Comment souhaitez-vous le supprimer ?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                {eventPendingDeletion.recurrenceId && !planningEvents.find(e => e.id === eventPendingDeletion.id)?.matchId && (
                    <Button variant="outline" onClick={() => executeDeleteEvent('single')}>Supprimer uniquement cette instance</Button>
                )}
                {planningEvents.find(e => e.id === eventPendingDeletion.id)?.matchId && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      eventPendingDeletion.recurrenceId
                        ? executeDeleteEvent('all_match_instances_in_series')
                        : executeDeleteEvent('all_match_instances_on_date')
                    }>
                      Supprimer ce match (toutes les unités {eventPendingDeletion.recurrenceId ? "de cette instance de série" : "sur cette date"})
                  </Button>
                )}
                 {eventPendingDeletion.recurrenceId && (
                    <Button variant="destructive" onClick={() => {
                        const eventMeta = planningEvents.find(e => e.id === eventPendingDeletion.id);
                        if (eventMeta?.matchId) {
                            executeDeleteEvent('all_match_instances_in_series');
                        } else {
                            executeDeleteEvent('all_in_series');
                        }
                    }}>Supprimer toute la série</Button>
                )}
                {!eventPendingDeletion.recurrenceId && planningEvents.find(e => e.id === eventPendingDeletion.id)?.matchId && (
                     <Button variant="destructive" onClick={() => executeDeleteEvent('all_match_instances_on_date')}>Supprimer ce match (toutes les unités)</Button>
                )}
                <AlertDialogCancel onClick={closeDeleteDialogs}>Annuler</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}

    
