
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO as parseISODateFns } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnnexeDefinition } from '@/app/administration/gestion-listes/annexes/page';

const timeStringToMinutes = (timeStr: string): number => {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
};

export const annexeEventFormSchema = z.object({
  id: z.string().optional(),
  date: z.date({ required_error: "La date est requise." }),
  annexeId: z.string().min(1, "L'annexe est requise."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format HH:MM requis."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format HH:MM requis."),
  eventName: z.string().min(1, "Le nom de l'événement est requis."),
}).refine(data => {
  const startMinutes = timeStringToMinutes(data.startTime);
  const endMinutes = timeStringToMinutes(data.endTime);
  return endMinutes > startMinutes;
}, {
  message: "L'heure de fin doit être après l'heure de début.",
  path: ['endTime'],
});

export type AnnexeEventFormData = z.infer<typeof annexeEventFormSchema>;

interface AddAnnexeEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AnnexeEventFormData, isEditing: boolean) => void;
  onDelete?: (eventId: string) => void;
  initialData?: Partial<AnnexeEventFormData>;
  isEditing?: boolean;
  annexeDefinitions: AnnexeDefinition[];
}

const generateTimeOptions = (): { value: string; label: string }[] => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    options.push({ value: `${String(h).padStart(2, '0')}:00`, label: `${String(h).padStart(2, '0')}:00` });
    options.push({ value: `${String(h).padStart(2, '0')}:30`, label: `${String(h).padStart(2, '0')}:30` });
  }
  return options;
};

export function AddAnnexeEventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  isEditing = false,
  annexeDefinitions,
}: AddAnnexeEventModalProps) {
  const form = useForm<AnnexeEventFormData>({
    resolver: zodResolver(annexeEventFormSchema),
    defaultValues: {
      date: new Date(),
      annexeId: annexeDefinitions.length > 0 ? annexeDefinitions[0].id : '',
      startTime: '09:00',
      endTime: '10:00',
      eventName: '',
      id: undefined,
    },
  });

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const resetValues: Partial<AnnexeEventFormData> = {
        date: new Date(),
        annexeId: annexeDefinitions.length > 0 ? annexeDefinitions[0].id : undefined,
        startTime: '09:00',
        endTime: '10:00',
        eventName: '',
        id: undefined,
      };

      if (initialData) {
        resetValues.date = initialData.date ? (initialData.date instanceof Date ? initialData.date : parseISODateFns(initialData.date as any as string)) : new Date();
        resetValues.annexeId = initialData.annexeId || (annexeDefinitions.length > 0 ? annexeDefinitions[0].id : undefined);
        resetValues.eventName = initialData.eventName || '';
        resetValues.startTime = initialData.startTime || '09:00';
        resetValues.endTime = initialData.endTime || '10:00';
        resetValues.id = initialData.id;
      }
      form.reset(resetValues);
    }
  }, [isOpen, initialData, form, annexeDefinitions]);

  const onSubmit = (data: AnnexeEventFormData) => {
    onSave(data, isEditing);
  };
  
  const handleDeleteClick = () => {
    if (isEditing && initialData?.id && onDelete) {
      onDelete(initialData.id);
    }
  };

  const timeOptions = React.useMemo(() => generateTimeOptions(), []);
  const modalTitle = isEditing ? "Modifier l'événement" : "Ajouter un événement à l'annexe";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour la réservation de l'annexe.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="eventName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de l'événement *</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date *</FormLabel>
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          onClick={() => setIsDatePickerOpen(true)}
                        >
                          {field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => { field.onChange(date); setIsDatePickerOpen(false); }}
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="annexeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annexe *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une annexe" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {annexeDefinitions.map(def => (
                        <SelectItem key={def.id} value={def.id}>{def.village} - {def.lieu}</SelectItem>
                      ))}
                      {annexeDefinitions.length === 0 && <p className="p-2 text-sm text-muted-foreground">Aucune annexe définie.</p>}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de début *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {timeOptions.map(option => <SelectItem key={`start-${option.value}`} value={option.value}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de fin *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {timeOptions.map(option => <SelectItem key={`end-${option.value}`} value={option.value}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4 flex justify-between">
              <div>
                {isEditing && initialData?.id && onDelete && (
                    <Button type="button" variant="destructive" onClick={handleDeleteClick}>Supprimer</Button>
                )}
              </div>
              <div className="flex space-x-2">
                  <DialogClose asChild><Button type="button" variant="outline" onClick={onClose}>Annuler</Button></DialogClose>
                  <Button type="submit">Enregistrer</Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
