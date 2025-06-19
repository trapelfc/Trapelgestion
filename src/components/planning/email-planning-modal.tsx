
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, parseISO, isSameDay, differenceInDays, getMonth, getDay, isSaturday, isSunday, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { PlanningEvent, CommuneDefinition, FieldDefinition } from '@/app/planning/occupation-stades/page';
import type { CategoryConfigItem } from '@/config/licencies-constants';
import { useToast } from '@/hooks/use-toast';
import { getPendingEmailsFromStorage, savePendingEmailsToStorage, type PendingEmail } from '@/app/inscription/paiement/page';

const EMAIL_TEMPLATE_PLANNING_SUBJECT_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_PLANNING_SUBJECT';
const EMAIL_TEMPLATE_PLANNING_BODY_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_PLANNING_BODY';

const DEFAULT_PLANNING_SUBJECT = "Plannification des {{TYPE_EVENEMENTS}} du TRAPEL FC en compétition du {{PERIODE_PLANNING}}";
const DEFAULT_PLANNING_BODY = `
Bonjour,

Vous trouverez ci-dessous l'occupation des terrains pour les matchs en compétition du TRAPEL FC pour {{PERIODE_PLANNING}}.

{{PLANNING_CONTENT}}

Nous vous remercions pour toute l'attention que vous porterez à ces informations ainsi que pour votre implication pour le bien des jeunes de vos territoires.

Bien cordialement,

SIGNATURE
`.trim();


const emailPlanningFormSchema = z.object({
  recipients: z.string().min(1, "Au moins une adresse e-mail est requise.")
    .refine(value => {
      const emails = value.split(/[,;\s]+/).filter(Boolean);
      return emails.every(email => z.string().email().safeParse(email).success);
    }, "Une ou plusieurs adresses e-mail sont invalides."),
  eventType: z.enum(['entrainement', 'match', 'both'], { required_error: "Veuillez sélectionner un type d'événement." }),
  useCustomPeriod: z.boolean().optional(),
  customStartDate: z.date().optional(),
  customEndDate: z.date().optional(),
}).superRefine((data, ctx) => {
  if (data.useCustomPeriod) {
    if (!data.customStartDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Date de début requise.", path: ["customStartDate"] });
    }
    if (!data.customEndDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Date de fin requise.", path: ["customEndDate"] });
    }
    if (data.customStartDate && data.customEndDate && isBefore(data.customEndDate, data.customStartDate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La date de fin doit être après la date de début.", path: ["customEndDate"] });
    }
    if (data.customStartDate && data.customEndDate && differenceInDays(data.customEndDate, data.customStartDate) > 31) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La période ne doit pas excéder 31 jours.", path: ["customEndDate"] });
    }
  }
});

type EmailPlanningFormData = z.infer<typeof emailPlanningFormSchema>;

interface EmailPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  allPlanningEvents: PlanningEvent[];
  stadesConfig: CommuneDefinition[];
  currentWeekStart: Date;
  currentWeekEnd: Date;
  categoriesWithColors: CategoryConfigItem[]; 
}

export function EmailPlanningModal({
  isOpen,
  onClose,
  allPlanningEvents,
  stadesConfig,
  currentWeekStart,
  currentWeekEnd,
  categoriesWithColors, 
}: EmailPlanningModalProps) {
  const { toast } = useToast();

  const form = useForm<EmailPlanningFormData>({
    resolver: zodResolver(emailPlanningFormSchema),
    defaultValues: {
      recipients: '',
      eventType: 'both',
      useCustomPeriod: false,
      customStartDate: currentWeekStart,
      customEndDate: currentWeekEnd,
    },
  });

  const watchedUseCustomPeriod = form.watch('useCustomPeriod');

  useEffect(() => {
    if (isOpen) {
      form.reset({
        recipients: '',
        eventType: 'both',
        useCustomPeriod: false,
        customStartDate: currentWeekStart,
        customEndDate: currentWeekEnd,
      });
    }
  }, [isOpen, currentWeekStart, currentWeekEnd, form]);
  

  const formatPlanningForEmailBody = (data: EmailPlanningFormData): { planningText: string; periodeLabel: string; dateDebut: string; dateFin: string } => {
    const startDate = data.useCustomPeriod && data.customStartDate ? data.customStartDate : currentWeekStart;
    const endDate = data.useCustomPeriod && data.customEndDate ? data.customEndDate : currentWeekEnd;

    let periodeLabel = `la semaine du ${format(startDate, "dd/MM/yyyy", { locale: fr })} au ${format(endDate, "dd/MM/yyyy", { locale: fr })}`;
    if (isSaturday(startDate) && isSunday(endDate) && differenceInDays(endDate, startDate) === 1) {
        periodeLabel = `le week-end du ${format(startDate, "d", { locale: fr })} et ${format(endDate, "d MMMM yyyy", { locale: fr })}`;
    } else if (isSameDay(startDate, endDate)) {
        periodeLabel = `le ${format(startDate, "dd MMMM yyyy", { locale: fr })}`;
    }
    
    const dateDebutFormatted = format(startDate, "dd/MM/yyyy", { locale: fr });
    const dateFinFormatted = format(endDate, "dd/MM/yyyy", { locale: fr });

    const filteredEvents = allPlanningEvents.filter(event => {
      const eventDate = parseISO(event.date);
      const isInPeriod = isWithinInterval(eventDate, { start: startDate, end: endDate }) || isSameDay(eventDate, startDate) || isSameDay(eventDate, endDate);
      if (!isInPeriod) return false;
      if (data.eventType === 'both') return true;
      return event.type === data.eventType;
    }).sort((a,b) => {
        const dateComparison = parseISO(a.date).getTime() - parseISO(b.date).getTime();
        if (dateComparison !== 0) return dateComparison;
        return a.startTime.localeCompare(b.startTime);
    });

    if (filteredEvents.length === 0) {
      return { planningText: "Aucun événement ne correspond aux critères pour cette période.", periodeLabel, dateDebut: dateDebutFormatted, dateFin: dateFinFormatted };
    }

    let emailBody = "";
    const eventsByCommuneThenDate: Record<string, Record<string, PlanningEvent[]>> = {};

    filteredEvents.forEach(event => {
        let communeName = "Commune Inconnue";
        for (const commune of stadesConfig) {
            if (commune.fields.some(field => field.id === event.stadeUnitId || field.units.some(unit => unit.id === event.stadeUnitId))) {
                communeName = commune.name;
                break;
            }
        }
        if (!eventsByCommuneThenDate[communeName]) eventsByCommuneThenDate[communeName] = {};
        if (!eventsByCommuneThenDate[communeName][event.date]) eventsByCommuneThenDate[communeName][event.date] = [];
        eventsByCommuneThenDate[communeName][event.date].push(event);
    });

    const sortedCommuneNames = Object.keys(eventsByCommuneThenDate).sort((a,b) => a.localeCompare(b));

    for (const communeName of sortedCommuneNames) {
        emailBody += `\n${communeName.toUpperCase()}\n`;
        emailBody += "========================\n";
        
        const eventsByDate = eventsByCommuneThenDate[communeName];
        const sortedDates = Object.keys(eventsByDate).sort((a,b) => parseISO(a).getTime() - parseISO(b).getTime());

        for (const dateStr of sortedDates) {
          const dateObj = parseISO(dateStr);
          emailBody += `  ${format(dateObj, "EEEE dd MMMM yyyy", { locale: fr })}\n`;
          emailBody += "  ------------------------\n";

          const eventsOnDay = eventsByDate[dateStr];
          const eventsByTerrain: Record<string, PlanningEvent[]> = {};
          const fieldObjectsForCommune = stadesConfig.find(c => c.name === communeName)?.fields || [];

          fieldObjectsForCommune.forEach(field => {
            eventsOnDay.forEach(event => {
              if (field.units.some(u => u.id === event.stadeUnitId) || field.id === event.stadeUnitId) {
                if (!eventsByTerrain[field.id]) eventsByTerrain[field.id] = [];
                eventsByTerrain[field.id].push(event);
              }
            });
          });
          
          const sortedFieldIds = Object.keys(eventsByTerrain).sort((a, b) => {
            const fieldA = fieldObjectsForCommune.find(f => f.id === a);
            const fieldB = fieldObjectsForCommune.find(f => f.id === b);
            return (fieldA?.name || a).localeCompare(fieldB?.name || b);
          });

          for (const fieldId of sortedFieldIds) {
            const fieldDefinition = fieldObjectsForCommune.find(f => f.id === fieldId);
            if (!fieldDefinition) continue;

            const unitEventsForField = eventsByTerrain[fieldId];
            const fieldEventsToDisplay: {displayName: string, events: PlanningEvent[]}[] = [];
            
            const matchEventsByMatchId = unitEventsForField
                .filter(e => e.type === 'match' && e.matchId)
                .reduce((acc, e) => {
                    if(!acc[e.matchId!]) acc[e.matchId!] = [];
                    acc[e.matchId!].push(e);
                    return acc;
                }, {} as Record<string, PlanningEvent[]>);

            let processedUnitIdsForMatches = new Set<string>();

            for(const matchId in matchEventsByMatchId) {
                const group = matchEventsByMatchId[matchId];
                if (group.length === 0) continue;
                const firstEventOfGroup = group[0];
                const unitsInGroup = new Set(group.map(e => e.stadeUnitId));

                if (fieldDefinition.units.length > 0 && fieldDefinition.units.every(u => unitsInGroup.has(u.id)) &&
                    group.every(e => e.startTime === firstEventOfGroup.startTime && e.endTime === firstEventOfGroup.endTime && e.categoryName === firstEventOfGroup.categoryName)
                ) {
                    fieldEventsToDisplay.push({ displayName: `${fieldDefinition.name} - Terrain Entier`, events: [firstEventOfGroup]});
                    fieldDefinition.units.forEach(u => processedUnitIdsForMatches.add(u.id));
                }
            }
            
            fieldDefinition.units.forEach(unit => {
                if(!processedUnitIdsForMatches.has(unit.id)){
                    const eventsForThisUnit = unitEventsForField.filter(e => e.stadeUnitId === unit.id && !e.matchId).sort((a,b) => a.startTime.localeCompare(b.startTime));
                    const individualMatchEventsForUnit = unitEventsForField.filter(e => e.stadeUnitId === unit.id && e.matchId && !matchEventsByMatchId[e.matchId!].some(groupedEvent => groupedEvent.id === e.id && fieldDefinition.units.every(u => matchEventsByMatchId[e.matchId!].map(ev => ev.stadeUnitId).includes(u.id)))).sort((a,b) => a.startTime.localeCompare(b.startTime));
                    
                    if (eventsForThisUnit.length > 0 || individualMatchEventsForUnit.length > 0) {
                         fieldEventsToDisplay.push({displayName: `${fieldDefinition.name} - ${unit.headerName}`, events: [...eventsForThisUnit, ...individualMatchEventsForUnit].sort((a,b) => a.startTime.localeCompare(b.startTime))});
                    }
                }
            });
             if (fieldDefinition.units.length === 0 && unitEventsForField.length > 0) { // Field without units
                fieldEventsToDisplay.push({ displayName: fieldDefinition.name, events: unitEventsForField.sort((a,b) => a.startTime.localeCompare(b.startTime)) });
            }


            fieldEventsToDisplay.sort((a,b) => a.displayName.localeCompare(b.displayName)).forEach(displayGroup => {
                emailBody += `    ${displayGroup.displayName}:\n`;
                displayGroup.events.forEach(event => {
                    const categoryIdOnly = event.categoryName;
                    let eventDesc = categoryIdOnly;
                    if (event.typePlateauCriterium) {
                        eventDesc += ` (${event.typePlateauCriterium}${event.plateauCriteriumNumber ? ` - ${event.plateauCriteriumNumber} équipes` : ''})`;
                    }
                    emailBody += `      - ${event.startTime} - ${event.endTime}: ${eventDesc}\n`;
                });
            });

            // Tracing notes logic
            if (data.eventType === 'match' || data.eventType === 'both') {
                const matchesOnThisFieldThisDay = unitEventsForField.filter(e => e.type === 'match');
                if (matchesOnThisFieldThisDay.length > 0) {
                    let isFullFieldMatchBooked = false;
                    for (const matchId in matchEventsByMatchId) {
                        const group = matchEventsByMatchId[matchId];
                        if (group.length === 0) continue;
                        const unitsInGroup = new Set(group.map(e => e.stadeUnitId));
                        if (fieldDefinition.units.length > 0 && fieldDefinition.units.every(u => unitsInGroup.has(u.id))) {
                            isFullFieldMatchBooked = true;
                            break;
                        }
                    }
                     if (fieldDefinition.units.length === 0 && matchesOnThisFieldThisDay.length > 0) { // Field has no units but has matches
                        isFullFieldMatchBooked = true;
                    }


                    if (isFullFieldMatchBooked) {
                        emailBody += `    Merci de réaliser le traçage du terrain à 11.\n`;
                    } else {
                        const matchSubUnitsUsed = new Set<string>();
                        matchesOnThisFieldThisDay.forEach(event => {
                            if (fieldDefinition.units.some(u => u.id === event.stadeUnitId)) {
                                matchSubUnitsUsed.add(event.stadeUnitId);
                            }
                        });
                        if (matchSubUnitsUsed.size > 0) {
                            const unitNamesForTracing = Array.from(matchSubUnitsUsed)
                                .map(unitId => fieldDefinition.units.find(u => u.id === unitId)?.headerName || unitId)
                                .sort((a,b) => a.localeCompare(b));
                            emailBody += `    Merci de réaliser le traçage des ${matchSubUnitsUsed.size} terrains à 8 sur ${unitNamesForTracing.join(', ')}.\n`;
                        }
                    }
                }
            }
          }
          emailBody += "\n";
        }
    }
    return { planningText: emailBody.trim(), periodeLabel, dateDebut: dateDebutFormatted, dateFin: dateFinFormatted };
  };


  const onSubmit = (data: EmailPlanningFormData) => {
    const { planningText, periodeLabel, dateDebut, dateFin } = formatPlanningForEmailBody(data);

    let emailSubjectTemplate = DEFAULT_PLANNING_SUBJECT;
    let emailBodyTemplate = DEFAULT_PLANNING_BODY;
    if (typeof window !== 'undefined') {
      emailSubjectTemplate = localStorage.getItem(EMAIL_TEMPLATE_PLANNING_SUBJECT_KEY) || DEFAULT_PLANNING_SUBJECT;
      emailBodyTemplate = localStorage.getItem(EMAIL_TEMPLATE_PLANNING_BODY_KEY) || DEFAULT_PLANNING_BODY;
    }

    let typeEvenementsText = "événements";
    if (data.eventType === 'match') typeEvenementsText = "matchs";
    else if (data.eventType === 'entrainement') typeEvenementsText = "entrainements";
    else if (data.eventType === 'both') typeEvenementsText = "matchs et entrainements";

    let finalSubject = emailSubjectTemplate.replace('{{TYPE_EVENEMENTS}}', typeEvenementsText);
    finalSubject = finalSubject.replace('{{PERIODE_PLANNING}}', periodeLabel);
    finalSubject = finalSubject.replace('{{DATE_DEBUT_PLANNING}}', dateDebut);
    finalSubject = finalSubject.replace('{{DATE_FIN_PLANNING}}', dateFin);
    
    let finalBody = emailBodyTemplate.replace('{{PLANNING_CONTENT}}', planningText);
    finalBody = finalBody.replace('{{DATE_DEBUT_PLANNING}}', dateDebut);
    finalBody = finalBody.replace('{{DATE_FIN_PLANNING}}', dateFin);
    finalBody = finalBody.replace('{{PERIODE_PLANNING}}', periodeLabel);


    const newPendingEmail: PendingEmail = {
        id: crypto.randomUUID(),
        licencieId: 'planning_general', 
        licencieNom: 'Planning',
        licenciePrenom: 'Général',
        licencieEmail: data.recipients, 
        packChoisi: '', 
        montantTotalDu: 0, 
        montantPaye: 0, 
        methodePaiement: undefined, 
        datePreparation: new Date().toISOString(),
        status: 'en_attente',
        sujet: finalSubject,
        corps: finalBody,
        source: 'Planning des Stades',
    };

    const pendingEmails = getPendingEmailsFromStorage();
    savePendingEmailsToStorage([...pendingEmails, newPendingEmail]);
    
    toast({
        title: "E-mail de Planning Préparé",
        description: `L'e-mail pour le planning a été ajouté à la liste des e-mails en attente. Destinataires: ${data.recipients}`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle>Envoyer le Planning par E-mail</DialogTitle>
          <DialogDescription>
            Configurez les options pour l'envoi du planning. L'e-mail sera ajouté à la file d'attente.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="recipients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destinataires (séparés par virgule, point-virgule ou espace)</FormLabel>
                  <FormControl><Input placeholder="email1@example.com, email2@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Type d'événements à inclure</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="entrainement" /></FormControl><FormLabel className="font-normal">Entraînements</FormLabel></FormItem>
                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="match" /></FormControl><FormLabel className="font-normal">Matchs</FormLabel></FormItem>
                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="both" /></FormControl><FormLabel className="font-normal">Les deux</FormLabel></FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="useCustomPeriod"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 pt-2">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-normal">Personnaliser la période (Max 31 jours)</FormLabel>
                </FormItem>
              )}
            />
            {watchedUseCustomPeriod && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customStartDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date de début</FormLabel>
                      <Popover><PopoverTrigger asChild><FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP", {locale: fr}) : <span>Choisir date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={fr} />
                        </PopoverContent>
                      </Popover><FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customEndDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date de fin</FormLabel>
                       <Popover><PopoverTrigger asChild><FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP", {locale: fr}) : <span>Choisir date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => form.getValues("customStartDate") ? isBefore(date, form.getValues("customStartDate")!) : false} locale={fr} />
                        </PopoverContent>
                      </Popover><FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose>
              <Button type="submit">Préparer l'E-mail</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

