
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { fr } from "date-fns/locale";
import { format } from "date-fns";
import { CalendarIcon, UserPlus } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { LicenseeCategory, Pack } from "@/lib/types";
import { addLicensee } from "@/lib/actions";

const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const formSchema = z.object({
  lastName: z.string().min(2, "Le nom de famille doit contenir au moins 2 caractères."),
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères."),
  sex: z.enum(["male", "female"], {
    required_error: "Veuillez sélectionner le sexe.",
  }),
  dateOfBirth: z.date({
    required_error: "Une date de naissance est requise.",
  }),
  placeOfBirth: z.string().optional(),
  bornAbroad: z.boolean().default(false),
  licenseeCategoryId: z.string({ required_error: "Veuillez sélectionner une catégorie." }),
  packId: z.string({ required_error: "Veuillez sélectionner un pack." }),
  phone: z.string().min(10, "Le numéro de téléphone doit être valide."),
  email: z.string().email("L'adresse e-mail n'est pas valide."),
  legalRepresentative: z.object({
    lastName: z.string().optional(),
    firstName: z.string().optional(),
    dateOfBirth: z.date().optional(),
    placeOfBirth: z.string().optional(),
    bornAbroad: z.boolean().default(false).optional(),
    email: z.string().optional(),
    fatherPhone: z.string().optional(),
    motherPhone: z.string().optional(),
  }).optional(),
}).superRefine((data, ctx) => {
    if (data.dateOfBirth) {
        const age = calculateAge(data.dateOfBirth);
        if (age < 18) {
            if (!data.legalRepresentative?.lastName || data.legalRepresentative.lastName.length < 2) {
                ctx.addIssue({ code: 'custom', message: 'Le nom du responsable doit contenir au moins 2 caractères.', path: ['legalRepresentative.lastName'] });
            }
            if (!data.legalRepresentative?.firstName || data.legalRepresentative.firstName.length < 2) {
                ctx.addIssue({ code: 'custom', message: 'Le prénom du responsable doit contenir au moins 2 caractères.', path: ['legalRepresentative.firstName'] });
            }
            if (!data.legalRepresentative?.email || !z.string().email().safeParse(data.legalRepresentative.email).success) {
                ctx.addIssue({ code: 'custom', message: "L'adresse e-mail du responsable n'est pas valide.", path: ['legalRepresentative.email'] });
            }
            if (!data.legalRepresentative?.dateOfBirth) {
                ctx.addIssue({ code: 'custom', message: 'La date de naissance du responsable est requise.', path: ['legalRepresentative.dateOfBirth'] });
            }
            if (!data.legalRepresentative?.placeOfBirth || data.legalRepresentative.placeOfBirth.length < 2) {
                ctx.addIssue({ code: 'custom', message: 'Le lieu de naissance du responsable est requis.', path: ['legalRepresentative.placeOfBirth'] });
            }
            if (!data.legalRepresentative?.fatherPhone && !data.legalRepresentative?.motherPhone) {
                ctx.addIssue({ code: 'custom', message: 'Au moins un numéro de téléphone de parent est requis.', path: ['legalRepresentative.fatherPhone'] });
            }
        }
    }
});

type FormValues = z.infer<typeof formSchema>;

interface AccueilInscriptionViewProps {
  licenseeCategories: LicenseeCategory[];
  packs: Pack[];
}

export function AccueilInscriptionView({ licenseeCategories, packs }: AccueilInscriptionViewProps) {
  const { toast } = useToast();
  const [isFormVisible, setIsFormVisible] = React.useState(false);
  const [isDobOpen, setDobOpen] = React.useState(false);
  const [isRepDobOpen, setRepDobOpen] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lastName: "",
      firstName: "",
      placeOfBirth: "",
      bornAbroad: false,
      phone: "",
      email: "",
      legalRepresentative: {
        lastName: "",
        firstName: "",
        placeOfBirth: "",
        bornAbroad: false,
        email: "",
        fatherPhone: "",
        motherPhone: "",
      },
    },
  });

  const watchedDateOfBirth = form.watch("dateOfBirth");
  const watchedSex = form.watch("sex");
  
  const isMinor = React.useMemo(() => {
    if (!watchedDateOfBirth) return false;
    return calculateAge(watchedDateOfBirth) < 18;
  }, [watchedDateOfBirth]);

  const findMatchingCategory = React.useCallback((birthDate: Date, sex: "male" | "female"): string | undefined => {
    if (!birthDate || !sex) return undefined;

    const birthYear = birthDate.getFullYear();
    const genderSuffix = sex === 'male' ? 'G' : 'F';

    for (const category of licenseeCategories) {
        const upperName = category.name.trim().toUpperCase();
        
        if (!upperName.endsWith(` ${genderSuffix}`) && !upperName.startsWith(`SENIORS ${genderSuffix}`)) {
          continue;
        }

        const description = category.description;
        const yearMatches = description.match(/\d{4}/g);

        if (yearMatches) {
            if (description.includes('avant ou en')) {
                const limitYear = parseInt(yearMatches[0], 10);
                if (birthYear <= limitYear) return category.id;
            } else if (yearMatches.length === 2) {
                const year1 = parseInt(yearMatches[0], 10);
                const year2 = parseInt(yearMatches[1], 10);
                if (birthYear === year1 || birthYear === year2) return category.id;
            } else if (yearMatches.length === 1) {
                const year = parseInt(yearMatches[0], 10);
                if (birthYear === year) return category.id;
            }
        }
    }
    return undefined;
  }, [licenseeCategories]);


  React.useEffect(() => {
    if (watchedDateOfBirth && watchedSex) {
      const categoryId = findMatchingCategory(watchedDateOfBirth, watchedSex);
      if (categoryId && form.getValues("licenseeCategoryId") !== categoryId) {
        form.setValue("licenseeCategoryId", categoryId, { shouldValidate: true });
      } else if (!categoryId) {
        form.setValue("licenseeCategoryId", "", { shouldValidate: true });
      }
    }
  }, [watchedDateOfBirth, watchedSex, findMatchingCategory, form]);


  async function onSubmit(values: FormValues) {
    try {
        await addLicensee(values);
        toast({
            title: "Inscription enregistrée !",
            description: "Vos informations ont été sauvegardées. Le club vous recontactera bientôt.",
        });
        form.reset();
        setIsFormVisible(false);
    } catch (error) {
        toast({
            title: "Erreur",
            description: "Une erreur est survenue lors de l'enregistrement de votre inscription.",
            variant: "destructive",
        });
    }
  }

  if (!isFormVisible) {
    return (
        <Card className="w-full max-w-4xl mx-auto shadow-lg text-center">
            <CardHeader className="px-6 pt-10">
                <CardTitle className="text-3xl font-headline">Rejoindre le Club</CardTitle>
                <CardDescription className="text-base pt-2">
                    Prêt à commencer une nouvelle saison avec nous ? Remplissez le formulaire d'inscription en quelques clics.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-8 pb-12">
                <Button size="lg" className="h-auto py-4 px-8 text-lg font-semibold" onClick={() => setIsFormVisible(true)}>
                    <UserPlus className="mr-3 h-6 w-6" />
                    Commencer l'inscription
                </Button>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-headline">Formulaire d'inscription</CardTitle>
        <CardDescription>Remplissez les informations de base du nouveau membre.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Prénom</FormLabel>
                        <FormControl>
                            <Input placeholder="ex: Jean" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                            <Input placeholder="ex: Dupont" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="sex"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Sexe</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex items-center space-x-4"
                            >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="male" />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">Homme</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="female" />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">Femme</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Date de naissance</FormLabel>
                        <Popover open={isDobOpen} onOpenChange={setDobOpen}>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                    format(field.value, "PPP", { locale: fr })
                                ) : (
                                    <span>Choisissez une date</span>
                                )}
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                locale={fr}
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                    field.onChange(date);
                                    setDobOpen(false);
                                }}
                                disabled={(date) =>
                                date > new Date() || date < new Date("1920-01-01")
                                }
                                captionLayout="dropdown-buttons"
                                fromYear={1920}
                                toYear={new Date().getFullYear()}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="placeOfBirth"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Lieu de naissance (facultatif)</FormLabel>
                        <FormControl>
                            <Input placeholder="ex: Paris" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="bornAbroad"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 h-10 mt-8">
                         <FormControl>
                            <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                            </FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer">
                                Né(e) à l'étranger
                            </FormLabel>
                        </div>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                            <Input type="tel" placeholder="ex: 06 12 34 56 78" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Adresse e-mail</FormLabel>
                        <FormControl>
                        <Input type="email" placeholder="ex: jean.dupont@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="licenseeCategoryId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Catégorie</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Catégorie assignée automatiquement..." />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {licenseeCategories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            La catégorie est calculée depuis la date de naissance et le sexe.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="packId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Pack</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Choisissez un pack" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {packs.map((pack) => (
                                <SelectItem key={pack.id} value={pack.id}>
                                    {`${pack.name} - ${pack.price}€`}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                {isMinor && (
                    <>
                        <div className="col-span-1 md:col-span-2 mt-6 mb-2">
                            <h3 className="text-xl font-semibold border-b pb-2">Responsable Légal</h3>
                        </div>

                        <FormField
                            control={form.control}
                            name="legalRepresentative.firstName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Prénom du responsable</FormLabel>
                                <FormControl>
                                    <Input placeholder="ex: Marc" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="legalRepresentative.lastName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nom du responsable</FormLabel>
                                <FormControl>
                                    <Input placeholder="ex: Dupont" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="legalRepresentative.dateOfBirth"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Date de naissance du responsable</FormLabel>
                                <Popover open={isRepDobOpen} onOpenChange={setRepDobOpen}>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={"outline"}
                                        className={cn( "w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                        >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisissez une date</span>}
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        locale={fr}
                                        mode="single"
                                        selected={field.value}
                                        onSelect={(date) => {
                                            field.onChange(date);
                                            setRepDobOpen(false);
                                        }}
                                        disabled={(date) => date > new Date() || date < new Date("1930-01-01")}
                                        captionLayout="dropdown-buttons"
                                        fromYear={1930}
                                        toYear={new Date().getFullYear() - 18}
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="legalRepresentative.placeOfBirth"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Lieu de naissance du responsable</FormLabel>
                                <FormControl>
                                    <Input placeholder="ex: Lyon" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="legalRepresentative.bornAbroad"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 h-10 mt-8">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel className="cursor-pointer">
                                        Né(e) à l'étranger
                                    </FormLabel>
                                </div>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="legalRepresentative.email"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Email du responsable</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="ex: marc.dupont@email.com" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="legalRepresentative.fatherPhone"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Téléphone Père</FormLabel>
                                <FormControl>
                                    <Input type="tel" placeholder="ex: 06 01 02 03 04" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="legalRepresentative.motherPhone"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Téléphone Mère</FormLabel>
                                <FormControl>
                                    <Input type="tel" placeholder="ex: 06 05 06 07 08" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </>
                )}


            </div>
            <div className="flex justify-between items-center pt-8">
              <Button type="button" variant="outline" onClick={() => setIsFormVisible(false)}>Annuler</Button>
              <Button type="submit" size="lg">Enregistrer et finaliser</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    
