
'use client';

import * as React from 'react';
import { useState, useEffect, useCallback }
from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, type ControllerRenderProps, type UseFormReturn } from 'react-hook-form';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from 'lucide-react';
import { format, differenceInYears, isValid, parse, getYear, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  INITIAL_PACK_OPTIONS,
  PACK_OPTIONS_STORAGE_KEY,
  AGE_BASED_CATEGORY_RULES,
  getActiveReferenceYear, // Utiliser la fonction dynamique
  getGeneratedCategoriesConfig,
  getStoredManualCategoryDefinitions // Nouvelle importation
} from '@/config/licencies-constants';
import type { LicencieItem } from '@/app/inscription/nouveau-licencie/page';

const eighteenYearsAgo = new Date();
eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

const getStoredPacks = (): string[] => {
  if (typeof window === 'undefined') return [...INITIAL_PACK_OPTIONS];
  const stored = localStorage.getItem(PACK_OPTIONS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        return parsed;
      }
    } catch (e) {
      // console.error("Failed to parse pack options from localStorage in AddLicencieModal", e);
    }
  }
  const initialPacks = [...INITIAL_PACK_OPTIONS];
  localStorage.setItem(PACK_OPTIONS_STORAGE_KEY, JSON.stringify(initialPacks));
  return initialPacks;
};

const addLicencieFormSchema = z.object({
  nom: z.string().min(1, "Le nom est requis."),
  prenom: z.string().min(1, "Le prénom est requis."),
  sexe: z.enum(['Masculin', 'Féminin', 'Autre'], { required_error: "Le sexe est requis." }),
  dateNaissance: z.date({ required_error: "La date de naissance est requise.", invalid_type_error: "Date de naissance invalide." })
    .max(new Date(), { message: "La date de naissance ne peut pas être dans le futur." })
    .refine(date => isValid(date), { message: "Date de naissance invalide." }),
  lieuNaissance: z.string().optional(),
  lieuNaissanceEtranger: z.boolean().optional().default(false),
  categorie: z.string().min(1, "La catégorie est requise."),
  packChoisi: z.string().min(1, "Le pack est requis."),
  telephone: z.string().optional(),
  email: z.string().email("L'adresse email est invalide.").optional().or(z.literal('')),
  isMineur: z.boolean().optional(),
  responsableLegalNom: z.string().optional(),
  responsableLegalPrenom: z.string().optional(),
  responsableLegalDateNaissance: z.date({ invalid_type_error: "Date de naissance du responsable invalide." }).optional().nullable(),
  responsableLegalLieuNaissance: z.string().optional(),
  responsableLegalLieuNaissanceEtranger: z.boolean().optional().default(false),
  responsableLegalEmail: z.string().email("L'adresse email du responsable est invalide.").optional().or(z.literal('')),
  responsableLegalTelPere: z.string().optional().or(z.literal('')),
  responsableLegalTelMere: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  const isMinorComputed = data.dateNaissance ? differenceInYears(new Date(), data.dateNaissance) < 18 : false;
  if (isMinorComputed) {
    if (!data.responsableLegalNom) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Le nom du responsable légal est requis.", path: ['responsableLegalNom'] });
    }
    if (!data.responsableLegalPrenom) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Le prénom du responsable légal est requis.", path: ['responsableLegalPrenom'] });
    }
    if (!data.responsableLegalDateNaissance) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La date de naissance du responsable légal est requise.", path: ['responsableLegalDateNaissance'] });
    } else if (!isValid(data.responsableLegalDateNaissance) || data.responsableLegalDateNaissance > eighteenYearsAgo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Date de naissance du responsable invalide ou responsable mineur.", path: ['responsableLegalDateNaissance'] });
    }
    if (!data.responsableLegalEmail) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "L'email du responsable légal est requis.", path: ['responsableLegalEmail'] });
    }
    if (!data.responsableLegalTelPere && !data.responsableLegalTelMere) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Au moins un numéro de téléphone de responsable (père ou mère) est requis.", path: ['responsableLegalTelPere'] });
    }
  }
});

export type NewLicencieData = z.infer<typeof addLicencieFormSchema>;

interface LicencieFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewLicencieData) => void;
  initialData?: LicencieItem | null;
}

export const DatePickerField = ({
  field,
  label,
  form,
  name,
  disabledFuture = true,
  customDisabledDateFn,
}: {
  field: ControllerRenderProps<NewLicencieData, any>;
  label: string;
  form: UseFormReturn<NewLicencieData>;
  name: keyof NewLicencieData;
  disabledFuture?: boolean;
  customDisabledDateFn?: (date: Date) => boolean;
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    if (field.value && isValid(new Date(field.value))) {
      const formattedDateValue = format(new Date(field.value), 'dd/MM/yyyy', { locale: fr });
      if (inputValue !== formattedDateValue) {
        setInputValue(formattedDateValue);
      }
    } else if (!field.value && inputValue !== '') {
       setInputValue('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/[^0-9]/g, '');
    let formattedValue = '';

    if (rawValue.length > 0) {
      formattedValue += rawValue.substring(0, 2);
    }
    if (rawValue.length > 2) {
      formattedValue += '/' + rawValue.substring(2, 4);
    }
    if (rawValue.length > 4) {
      formattedValue += '/' + rawValue.substring(4, 8);
    }
    
    setInputValue(formattedValue);

    if (formattedValue.length === 10) {
      const parsedDate = parse(formattedValue, 'dd/MM/yyyy', new Date());
      if (isValid(parsedDate)) {
        let isDisabled = false;
        if (disabledFuture && name === 'dateNaissance' && parsedDate > new Date()) isDisabled = true;
        if (name === 'responsableLegalDateNaissance' && parsedDate > eighteenYearsAgo) isDisabled = true;
        if (customDisabledDateFn && customDisabledDateFn(parsedDate)) isDisabled = true;

        if (!isDisabled) {
          field.onChange(parsedDate);
          form.clearErrors(name);
        } else {
          form.setError(name, { type: 'manual', message: 'Date non autorisée.' });
        }
      } else {
         form.setError(name, { type: 'manual', message: 'Format de date invalide (jj/mm/aaaa attendu).' });
      }
    } else if (formattedValue.length > 0 && formattedValue.length < 10) {
      const currentError = form.formState.errors[name];
      if (currentError && (currentError.type === 'manual' || currentError.type === 'custom')) {
        form.clearErrors(name);
      }
    } else if (formattedValue.length === 0 && field.value) {
      field.onChange(null);
    }
  };
  
  const handleInputBlur = () => {
    if (inputValue.trim() === '') {
      field.onChange(null);
      form.trigger(name);
      return;
    }
    const parsedDate = parse(inputValue, 'dd/MM/yyyy', new Date());
    if (isValid(parsedDate)) {
      let isDisabled = false;
      if (disabledFuture && name === 'dateNaissance' && parsedDate > new Date()) isDisabled = true;
      if (name === 'responsableLegalDateNaissance' && parsedDate > eighteenYearsAgo) isDisabled = true;
      if (customDisabledDateFn && customDisabledDateFn(parsedDate)) isDisabled = true;

      if (!isDisabled) {
        field.onChange(parsedDate);
        form.clearErrors(name);
      } else {
        form.setError(name, { type: 'manual', message: 'Date non autorisée.' });
      }
    } else {
      form.setError(name, { type: 'manual', message: 'Format de date invalide (jj/mm/aaaa attendu).' });
    }
    form.trigger(name);
  };

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      field.onChange(selectedDate);
      setInputValue(format(selectedDate, 'dd/MM/yyyy', { locale: fr }));
      form.clearErrors(name);
      form.trigger(name);
    } else {
      field.onChange(null);
      setInputValue('');
      form.trigger(name);
    }
    setIsCalendarOpen(false);
  };

  return (
    <FormItem className="flex flex-col">
      <FormLabel>{label}</FormLabel>
      <div className="flex items-center space-x-2">
        <Input
          type="text"
          placeholder="jj/mm/aaaa"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          maxLength={10}
          className={cn(form.formState.errors[name] && "border-destructive")}
        />
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" type="button" aria-label="Ouvrir calendrier" onClick={() => setIsCalendarOpen(prev => !prev)}>
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={field.value && isValid(new Date(field.value)) ? new Date(field.value) : undefined}
              onSelect={handleCalendarSelect}
              disabled={(date) =>
                (name === 'dateNaissance' && disabledFuture && date > new Date()) ||
                (name === 'responsableLegalDateNaissance' && date > eighteenYearsAgo) ||
                (customDisabledDateFn && customDisabledDateFn(date)) ||
                !isValid(date)
              }
              locale={fr}
              captionLayout="dropdown-buttons"
              fromYear={1920}
              toYear={new Date().getFullYear()}
            />
          </PopoverContent>
        </Popover>
      </div>
      <FormMessage />
    </FormItem>
  );
};


export function LicencieFormModal({ isOpen, onClose, onSave, initialData }: LicencieFormModalProps) {
  const [packOptions, setPackOptions] = useState<string[]>([]);
  const [categoriesOptions, setCategoriesOptions] = useState(getGeneratedCategoriesConfig(getActiveReferenceYear()));

  const form = useForm<NewLicencieData>({
    resolver: zodResolver(addLicencieFormSchema),
    defaultValues: {
      nom: '',
      prenom: '',
      sexe: undefined,
      dateNaissance: undefined,
      lieuNaissance: '',
      lieuNaissanceEtranger: false,
      categorie: '',
      packChoisi: '',
      telephone: '',
      email: '',
      isMineur: false,
      responsableLegalNom: '',
      responsableLegalPrenom: '',
      responsableLegalDateNaissance: null,
      responsableLegalLieuNaissance: '',
      responsableLegalLieuNaissanceEtranger: false,
      responsableLegalEmail: '',
      responsableLegalTelPere: '',
      responsableLegalTelMere: '',
    },
    mode: 'onBlur',
  });

  const watchedDateNaissance = form.watch('dateNaissance');
  const watchedSexe = form.watch('sexe');

  const isMineur = React.useMemo(() => {
    if (!watchedDateNaissance || !isValid(watchedDateNaissance)) return false;
    return differenceInYears(new Date(), watchedDateNaissance) < 18;
  }, [watchedDateNaissance]);

  useEffect(() => {
    form.setValue('isMineur', isMineur, { shouldValidate: false });
    const fieldsToValidate: (keyof NewLicencieData)[] = [
      'responsableLegalNom', 'responsableLegalPrenom', 'responsableLegalDateNaissance',
      'responsableLegalEmail', 'responsableLegalTelPere', 'responsableLegalTelMere',
    ];
    if (isMineur) {
      if (form.formState.isSubmitted || Object.keys(form.formState.touchedFields).some(field => fieldsToValidate.includes(field as any))) {
        form.trigger(fieldsToValidate);
      }
    } else {
      fieldsToValidate.forEach(field => form.clearErrors(field));
    }
  }, [isMineur, form]);

  useEffect(() => {
    const dob = form.getValues('dateNaissance');
    const currentSexe = form.getValues('sexe');
    const currentFullCategoryFromForm = form.getValues('categorie');
    const activeReferenceYear = getActiveReferenceYear();
    const manualCategoryDefinitions = getStoredManualCategoryDefinitions();

    const isCurrentCategoryManual = manualCategoryDefinitions.some(mc => mc.id === currentFullCategoryFromForm);

    if (isCurrentCategoryManual && initialData && initialData.categorie === currentFullCategoryFromForm) {
      return; 
    }
     if (isCurrentCategoryManual && !initialData && form.formState.dirtyFields.categorie) {
      return; 
    }

    if (dob && isValid(dob) && currentSexe && currentSexe !== 'Autre') {
      const birthDateObj = new Date(dob);
      const referenceDateObj = new Date(activeReferenceYear, 0, 1); 
      const age = differenceInYears(referenceDateObj, birthDateObj);

      let determinedBaseId: string | null = null;
      for (const rule of AGE_BASED_CATEGORY_RULES) {
        if ('ages' in rule && rule.ages.includes(age)) {
          determinedBaseId = rule.baseId;
          break;
        } else if ('ageMin' in rule && age >= rule.ageMin) {
          determinedBaseId = rule.baseId;
          break;
        }
      }

      if (determinedBaseId) {
        const genderSuffix = currentSexe === 'Féminin' ? ' F' : ' G'; // Ajout d'un espace
        const newCategoryValue = `${determinedBaseId}${genderSuffix}`;
        if (currentFullCategoryFromForm !== newCategoryValue) {
          form.setValue('categorie', newCategoryValue, { shouldValidate: true, shouldDirty: true });
        }
      } else {
         if (!isCurrentCategoryManual && currentFullCategoryFromForm !== '') {
           form.setValue('categorie', '', { shouldValidate: true, shouldDirty: true });
         }
      }
    } else if ((!dob || !currentSexe || currentSexe === 'Autre') && !isCurrentCategoryManual && currentFullCategoryFromForm !== '') {
       form.setValue('categorie', '', { shouldValidate: true, shouldDirty: true });
    }
  }, [watchedDateNaissance, watchedSexe, form, initialData]);


  React.useEffect(() => {
    if (isOpen) {
      setPackOptions(getStoredPacks());
      setCategoriesOptions(getGeneratedCategoriesConfig(getActiveReferenceYear()));

      if (initialData) {
        const dataToReset: NewLicencieData = {
          nom: initialData.nom,
          prenom: initialData.prenom,
          sexe: initialData.sexe,
          dateNaissance: initialData.dateNaissance instanceof Date ? initialData.dateNaissance : parseISO(initialData.dateNaissance as any as string),
          lieuNaissance: initialData.lieuNaissance || '',
          lieuNaissanceEtranger: initialData.lieuNaissanceEtranger || false,
          categorie: initialData.categorie,
          packChoisi: initialData.packChoisi,
          telephone: initialData.telephone || '',
          email: initialData.email || '',
          isMineur: initialData.dateNaissance ? differenceInYears(new Date(), initialData.dateNaissance instanceof Date ? initialData.dateNaissance : parseISO(initialData.dateNaissance as any as string)) < 18 : false,
          responsableLegalNom: initialData.responsableLegal?.nom || '',
          responsableLegalPrenom: initialData.responsableLegal?.prenom || '',
          responsableLegalDateNaissance: initialData.responsableLegal?.dateNaissance
            ? (initialData.responsableLegal.dateNaissance instanceof Date ? initialData.responsableLegal.dateNaissance : parseISO(initialData.responsableLegal.dateNaissance as any as string))
            : null,
          responsableLegalLieuNaissance: initialData.responsableLegal?.lieuNaissance || '',
          responsableLegalLieuNaissanceEtranger: initialData.responsableLegal?.lieuNaissanceEtranger || false,
          responsableLegalEmail: initialData.responsableLegal?.email || '',
          responsableLegalTelPere: initialData.responsableLegal?.telPere || '',
          responsableLegalTelMere: initialData.responsableLegal?.telMere || '',
        };
        form.reset(dataToReset);
      } else {
        form.reset({
            nom: '', prenom: '', sexe: undefined, dateNaissance: undefined, lieuNaissance: '', lieuNaissanceEtranger: false, categorie: '', packChoisi: '',
            telephone: '', email: '', isMineur: false, responsableLegalNom: '', responsableLegalPrenom: '', responsableLegalDateNaissance: null,
            responsableLegalLieuNaissance: '', responsableLegalLieuNaissanceEtranger: false, responsableLegalEmail: '', responsableLegalTelPere: '', responsableLegalTelMere: '',
        });
      }
    }
  }, [isOpen, initialData, form]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === PACK_OPTIONS_STORAGE_KEY && isOpen) {
        setPackOptions(getStoredPacks());
      }
      if (event.key === REFERENCE_YEAR_STORAGE_KEY && isOpen) {
        setCategoriesOptions(getGeneratedCategoriesConfig(getActiveReferenceYear()));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isOpen]);

  const onSubmit = (data: NewLicencieData) => {
    onSave(data);
    onClose();
  };

  const modalTitle = initialData ? "Modifier le licencié" : "Ajouter un nouveau licencié";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>
            Remplissez les informations ci-dessous. Les champs marqués d'une * sont obligatoires.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto py-2 pr-4 pl-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom *</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prenom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom *</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="sexe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sexe *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="Masculin" /></FormControl>
                          <FormLabel className="font-normal">Masculin</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="Féminin" /></FormControl>
                          <FormLabel className="font-normal">Féminin</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="Autre" /></FormControl>
                          <FormLabel className="font-normal">Autre</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateNaissance"
                render={({ field }) => (
                  <DatePickerField
                    field={field}
                    label="Date de naissance *"
                    form={form}
                    name="dateNaissance"
                  />
                )}
              />

              <FormField
                control={form.control}
                name="lieuNaissance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lieu de naissance</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lieuNaissanceEtranger"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2">
                    <FormControl>
                      <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal mt-[2px!important]">Né(e) à l'étranger</FormLabel>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categorie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie *</FormLabel>
                      <Select onValueChange={(value) => {
                          field.onChange(value);
                          const currentSexe = form.getValues('sexe');
                          const manualCategories = getStoredManualCategoryDefinitions();
                          // Check if the selected category is manual
                          if (manualCategories.some(mc => mc.id === value)) {
                            // It's a manual category, do nothing more (no gender suffix)
                          } else if (currentSexe && currentSexe !== 'Autre') {
                            // It's an age-based category, ensure suffix is there
                            const genderSuffix = currentSexe === 'Féminin' ? ' F' : ' G';
                            if (!value.endsWith(genderSuffix)) {
                                // This case should ideally not happen if Select options are correctly generated
                                // But as a safeguard or if Select shows only baseId
                                const baseId = value.split(' ')[0];
                                field.onChange(`${baseId}${genderSuffix}`);
                            }
                          }
                        }} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une catégorie">
                              {categoriesOptions.find(c => c.id === field.value)?.label || field.value || "Sélectionner une catégorie"}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoriesOptions.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.label}
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
                  name="packChoisi"
                   render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pack *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un pack" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {packOptions.map((pack) => (
                            <SelectItem key={pack} value={pack}>
                              {pack}
                            </SelectItem>
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
                name="telephone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl><Input type="tel" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isMineur && (
                <div className="space-y-4 pt-4 border-t mt-6">
                  <h3 className="text-lg font-medium">Responsable Légal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="responsableLegalNom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom du responsable *</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="responsableLegalPrenom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom du responsable *</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="responsableLegalDateNaissance"
                    render={({ field }) => (
                      <DatePickerField
                        field={field}
                        label="Date de naissance du responsable *"
                        form={form}
                        name="responsableLegalDateNaissance"
                        customDisabledDateFn={(date) => date > eighteenYearsAgo}
                        disabledFuture={false}
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="responsableLegalLieuNaissance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lieu de naissance du responsable</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="responsableLegalLieuNaissanceEtranger"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2">
                        <FormControl>
                          <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="font-normal mt-[2px!important]">Né(e) à l'étranger (Responsable)</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="responsableLegalEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email du responsable *</FormLabel>
                        <FormControl><Input type="email" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="responsableLegalTelPere"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone Père (au moins un requis si mineur)</FormLabel>
                          <FormControl><Input type="tel" {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="responsableLegalTelMere"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone Mère (au moins un requis si mineur)</FormLabel>
                          <FormControl><Input type="tel" {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </form>
          </Form>
        </div>
        <DialogFooter className="pt-4 border-t mt-auto">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
          </DialogClose>
          <Button type="button" onClick={form.handleSubmit(onSubmit)}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Correction de l'exportation de la modale principale si elle était nommée LicencieFormModal
export { LicencieFormModal };

const REFERENCE_YEAR_STORAGE_KEY = 'TRAPEL_FC_REFERENCE_YEAR_SETTING';
