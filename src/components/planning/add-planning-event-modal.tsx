
'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format, parseISO as parseISODateFns, isValid as isValidDateFns, isBefore, isEqual } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getActiveReferenceYear, getGeneratedCategoriesConfig, type CategoryId } from '@/config/licencies-constants';

const timeStringToMinutes = (timeStr: string): number => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

export const planningEventFormSchema = z.object({
  id: z.string().optional(),
  date: z.date({ required_error: "La date est requise." }),
  type: z.enum(['entrainement', 'match'], { required_error: "Le type d'événement est requis." }),
  isRecurrent: z.boolean().optional().default(false),
  recurrenceType: z.enum(['weekly', 'biweekly']).optional(),
  endDate: z.date().optional().nullable(),
  stadeUnitId: z.string().min(1, "Le stade est requis."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format HH:MM requis."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format HH:MM requis."),
  categoryName: z.string().min(1, "Le nom de la catégorie/équipe est requis."),
  typePlateauCriterium: z.enum(['plateau', 'criterium']).nullable().optional(),
  plateauCriteriumNumber: z.coerce.number().int().min(0, "Le nombre doit être positif ou nul.").optional(),
  recurrenceId: z.string().optional(),
  matchId: z.string().optional(),
}).refine(data => {
  const startMinutes = timeStringToMinutes(data.startTime);
  const endMinutes = timeStringToMinutes(data.endTime);
  return endMinutes > startMinutes;
}, {
  message: "L'heure de fin doit être après l'heure de début.",
  path: ['endTime'],
}).superRefine((data, ctx) => {
  if (data.isRecurrent) {
    if (!data.recurrenceType) {
       ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le type de récurrence est requis.",
        path: ["recurrenceType"],
      });
    }
    if (!data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date de fin est requise pour un événement récurrent.",
        path: ["endDate"],
      });
    } else if (data.endDate && (isBefore(data.endDate, data.date) || isEqual(data.endDate, data.date))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date de fin doit être postérieure à la date de début.",
        path: ["endDate"],
      });
    }
  }
  if ((data.typePlateauCriterium === 'plateau' || data.typePlateauCriterium === 'criterium') && (data.plateauCriteriumNumber === undefined || data.plateauCriteriumNumber === null || data.plateauCriteriumNumber < 0) ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Le nombre d'équipes est requis si 'Plateau' ou 'Critérium' est sélectionné.",
      path: ["plateauCriteriumNumber"],
    });
  }
});

export type PlanningEventFormData = z.infer<typeof planningEventFormSchema>;

interface AddPlanningEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PlanningEventFormData, isEditing: boolean) => void;
  onDelete?: (eventId: string, recurrenceId?: string, eventDateISO?: string) => void;
  stadeOptions: { value: string; label: string; }[];
  initialData?: Partial<PlanningEventFormData>;
  isEditing?: boolean;
}

const generateTimeOptions = (startHour: number, endHour: number, intervalMinutes: number = 30): { value: string; label: string }[] => {
  const options = [];
  for (let h = startHour; h < endHour; h++) {
    options.push({ value: `${String(h).padStart(2, '0')}:00`, label: `${String(h).padStart(2, '0')}:00` });
    if (intervalMinutes === 30) {
      options.push({ value: `${String(h).padStart(2, '0')}:30`, label: `${String(h).padStart(2, '0')}:30` });
    }
  }
  return options;
};

export function AddPlanningEventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  stadeOptions,
  initialData,
  isEditing = false,
}: AddPlanningEventModalProps) {
  const form = useForm<PlanningEventFormData>({
    resolver: zodResolver(planningEventFormSchema),
    defaultValues: {
      date: new Date(),
      type: initialData?.type || 'entrainement',
      isRecurrent: false,
      recurrenceType: 'weekly',
      endDate: null,
      stadeUnitId: '',
      startTime: '17:00',
      endTime: '18:00',
      categoryName: '',
      typePlateauCriterium: null,
      plateauCriteriumNumber: undefined,
      id: undefined,
      recurrenceId: undefined,
      matchId: undefined,
    },
  });

  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const [categoriesOptions, setCategoriesOptions] = useState<{id: CategoryId, label: string}[]>([]);

  useEffect(() => {
    if (isOpen) {
      const activeYear = getActiveReferenceYear();
      setCategoriesOptions(getGeneratedCategoriesConfig(activeYear));

      const defaultValues: PlanningEventFormData = {
        date: initialData?.date instanceof Date ? initialData.date : (initialData?.date ? parseISODateFns(initialData.date as any as string) : new Date()),
        type: initialData?.type || 'entrainement',
        isRecurrent: initialData?.isRecurrent || false,
        recurrenceType: initialData?.recurrenceType || (initialData?.isRecurrent ? 'weekly' : undefined),
        endDate: initialData?.endDate ? (initialData.endDate instanceof Date ? initialData.endDate : parseISODateFns(initialData.endDate as any as string)) : null,
        stadeUnitId: initialData?.stadeUnitId || '',
        startTime: initialData?.startTime || '17:00',
        endTime: initialData?.endTime || '18:00',
        categoryName: initialData?.categoryName || '',
        typePlateauCriterium: initialData?.typePlateauCriterium === undefined ? null : initialData.typePlateauCriterium,
        plateauCriteriumNumber: initialData?.plateauCriteriumNumber,
        id: initialData?.id,
        recurrenceId: initialData?.recurrenceId,
        matchId: initialData?.matchId,
      };
      form.reset(defaultValues);
    }
  }, [isOpen, initialData, form]);

  const onSubmit = (data: PlanningEventFormData) => {
    onSave(data, isEditing);
    onClose();
  };

  const handleDeleteClick = () => {
    if (isEditing && initialData?.id && onDelete) {
       const eventDateISO = initialData.date ? (initialData.date instanceof Date ? initialData.date.toISOString().split('T')[0] : initialData.date.toString().split('T')[0] ) : undefined;
      onDelete(initialData.id, initialData.recurrenceId, eventDateISO);
      onClose();
    }
  };

  const timeOptions = useMemo(() => generateTimeOptions(0, 24), []);
  const watchedIsRecurrent = form.watch('isRecurrent');
  const watchedStartDate = form.watch('date');
  const watchedTypePlateauCriterium = form.watch('typePlateauCriterium');
  const modalTitle = isEditing ? "Modifier le créneau" : "Ajouter un créneau";
  const isEditingRecurrentInstance = isEditing && !!form.getValues('recurrenceId') && form.getValues('isRecurrent');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour {isEditing ? "modifier" : "réserver"} un créneau.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Type d'événement *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="entrainement" /></FormControl>
                        <FormLabel className="font-normal">Entraînement</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="match" /></FormControl>
                        <FormLabel className="font-normal">Match</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center space-x-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col flex-1">
                    <FormLabel>Date *</FormLabel>
                    <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            onClick={() => setIsStartDatePickerOpen(true)}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: fr })
                            ) : (
                              <span>Choisir une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setIsStartDatePickerOpen(false);
                          }}
                          disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1)) }
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
                name="isRecurrent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-end space-x-2 pb-2">
                     <FormControl>
                        <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (checked && !form.getValues('recurrenceType')) {
                                form.setValue('recurrenceType', 'weekly');
                            }
                        }}
                        id="isRecurrent"
                        disabled={isEditingRecurrentInstance}
                        />
                    </FormControl>
                    <FormLabel htmlFor="isRecurrent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Récurrent
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {watchedIsRecurrent && !isEditingRecurrentInstance && (
              <>
                <FormField
                  control={form.control}
                  name="recurrenceType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Type de récurrence *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value || 'weekly'}
                          className="flex space-x-4"
                          disabled={isEditingRecurrentInstance}
                        >
                          <FormItem className="flex items-center space-x-2">
                            <FormControl><RadioGroupItem value="weekly" /></FormControl>
                            <FormLabel className="font-normal">Chaque semaine</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl><RadioGroupItem value="biweekly" /></FormControl>
                            <FormLabel className="font-normal">1 semaine sur 2</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date de fin (Récurrence) *</FormLabel>
                      <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              onClick={() => setIsEndDatePickerOpen(true)}
                              disabled={isEditingRecurrentInstance}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: fr })
                              ) : (
                                <span>Choisir une date de fin</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setIsEndDatePickerOpen(false);
                            }}
                            disabled={(date) => watchedStartDate ? (isBefore(date, watchedStartDate) || isEqual(date, watchedStartDate)) : false}
                            locale={fr}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="stadeUnitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stade / Unité *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une unité de stade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stadeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
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
                        {timeOptions.map(option => (
                          <SelectItem key={`start-${option.value}`} value={option.value}>{option.label}</SelectItem>
                        ))}
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
                        {timeOptions.map(option => (
                          <SelectItem key={`end-${option.value}`} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categoryName"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Catégorie / Équipe *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie/équipe" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoriesOptions.map(option => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="typePlateauCriterium"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Type Spécifique</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => field.onChange(value === "aucun" ? null : value)}
                      value={field.value ?? "aucun"}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="aucun" /></FormControl>
                        <FormLabel className="font-normal">Aucun</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="plateau" /></FormControl>
                        <FormLabel className="font-normal">Plateau</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="criterium" /></FormControl>
                        <FormLabel className="font-normal">Critérium</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(watchedTypePlateauCriterium === 'plateau' || watchedTypePlateauCriterium === 'criterium') && (
              <FormField
                control={form.control}
                name="plateauCriteriumNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre d'équipes *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 4"
                        {...field}
                        value={field.value === undefined ? '' : field.value}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="pt-4 flex justify-between">
              <div>
                {isEditing && initialData?.id && onDelete && (
                  <Button type="button" variant="destructive" onClick={handleDeleteClick}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </Button>
                )}
              </div>
              <div className="flex space-x-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Annuler
                  </Button>
                </DialogClose>
                <Button type="submit">Enregistrer</Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
