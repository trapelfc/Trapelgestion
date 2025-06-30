
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, CalendarIcon, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Licensee, LicenseeCategory, Pack, PaymentMethod, Reduction, AppliedReduction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { updateLicenseePaymentDetails, addLicensee } from "@/lib/actions";

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

interface PaiementViewProps {
  licensees: Licensee[];
  licenseeCategories: LicenseeCategory[];
  packs: Pack[];
  reductions?: Reduction[];
}

const paymentMethods: PaymentMethod[] = ['Espèces', 'Chèque', 'CB', 'Virement'];

export function PaiementView({
  licensees,
  licenseeCategories,
  packs,
  reductions,
}: PaiementViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isManageDialogOpen, setManageDialogOpen] = React.useState(false);
  const [selectedLicensee, setSelectedLicensee] = React.useState<Licensee | null>(null);
  const [isAddDialogOpen, setAddDialogOpen] = React.useState(false);
  const [isPaymentDateOpen, setPaymentDateOpen] = React.useState(false);
  const [isNewDobOpen, setNewDobOpen] = React.useState(false);
  const [isNewRepDobOpen, setNewRepDobOpen] = React.useState(false);
  
  const [paymentData, setPaymentData] = React.useState({
    paymentStatus: 'En attente' as Licensee['paymentStatus'],
    paymentMethod: undefined as PaymentMethod | undefined,
    paymentDate: undefined as Date | undefined,
    amountPaid: 0,
    paymentComment: '',
    reductions: [] as AppliedReduction[],
  });

  const [nameFilter, setNameFilter] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");

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

  async function onFormSubmit(values: FormValues) {
    try {
        await addLicensee(values);
        toast({
            title: "Inscription ajoutée !",
            description: "Le nouveau licencié a été ajouté et apparaît maintenant dans la liste.",
        });
        form.reset();
        setAddDialogOpen(false);
        router.refresh();
    } catch (error) {
        toast({
            title: "Erreur",
            description: "Une erreur est survenue lors de l'enregistrement de l'inscription.",
            variant: "destructive",
        });
    }
  }

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value);
  };

  const licenseesToDisplay = licensees
    .filter(lic => lic.paymentStatus !== 'Payé')
    .filter(lic => {
        const fullName = `${lic.firstName} ${lic.lastName}`.toLowerCase();
        const nameMatch = nameFilter ? fullName.includes(nameFilter.toLowerCase()) : true;
        const categoryMatch = categoryFilter !== "all" ? lic.licenseeCategoryId === categoryFilter : true;
        return nameMatch && categoryMatch;
    });

  const getCategoryName = (id: string) => {
    return licenseeCategories.find((cat) => cat.id === id)?.name ?? "N/A";
  };
  
  const getPack = (id: string) => {
    return packs.find((p) => p.id === id);
  };

  const handleManageClick = (licensee: Licensee) => {
    setSelectedLicensee(licensee);
    setPaymentData({
        paymentStatus: licensee.paymentStatus,
        paymentMethod: licensee.paymentMethod,
        paymentDate: licensee.paymentDate || new Date(),
        amountPaid: licensee.amountPaid || 0,
        paymentComment: licensee.paymentComment || '',
        reductions: licensee.reductions || [],
    });
    setManageDialogOpen(true);
  };

  const handleSaveChanges = async () => {
    if (selectedLicensee) {
      await updateLicenseePaymentDetails(selectedLicensee.id, paymentData);
      toast({
        title: "Paiement mis à jour",
        description: `Le paiement de ${selectedLicensee.firstName} ${selectedLicensee.lastName} a été sauvegardé.`,
      });
      setManageDialogOpen(false);
      setSelectedLicensee(null);
      router.refresh();
    }
  };

  const clearFilters = () => {
    setNameFilter("");
    setCategoryFilter("all");
  }

  const currentPack = selectedLicensee ? getPack(selectedLicensee.packId) : null;
  const packPrice = currentPack?.price ?? 0;
  
  const appliedReductionDetails = (paymentData.reductions || [])
    .map(applied => (reductions || []).find(r => r.id === applied.id))
    .filter((r): r is Reduction => !!r);
  
  let priceAfterMultipliers = packPrice;
  appliedReductionDetails.forEach(r => {
    if (r.multiplier && r.multiplier !== 1) {
        priceAfterMultipliers *= r.multiplier;
    }
  });
  
  const totalFixedReduction = appliedReductionDetails.reduce((total, r) => {
    return total + (r.amount || 0);
  }, 0);

  const priceAfterReductions = Math.max(0, priceAfterMultipliers - totalFixedReduction);


  let remainingAmount = priceAfterReductions;
  if (paymentData.paymentStatus === 'Payé') {
      remainingAmount = 0;
  } else if (paymentData.paymentStatus === 'Partiel') {
      remainingAmount = priceAfterReductions - (paymentData.amountPaid || 0);
  }
  remainingAmount = Math.max(0, remainingAmount);

  const isReductionApplied = (reductionId: string) => {
    return (paymentData.reductions || []).some(r => r.id === reductionId);
  }

  const getReductionEffectDisplay = (reduction: Reduction) => {
    if (reduction.multiplier && reduction.multiplier !== 1) {
        return `(x${reduction.multiplier})`;
    }
    if (reduction.amount && reduction.amount > 0) {
        return `(-${reduction.amount}€)`;
    }
    return '';
  };


  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Gestion des Paiements</CardTitle>
          <CardDescription>
            Gérez les paiements des inscriptions en attente. Filtrez par nom ou catégorie pour affiner la recherche.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Input
              placeholder="Filtrer par nom..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="max-w-sm"
            />
            <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Filtrer par catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {licenseeCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(nameFilter || categoryFilter !== "all") && (
              <Button variant="ghost" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Effacer
              </Button>
            )}
            <div className="flex-grow"></div>
            <Button onClick={() => setAddDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Ajouter une inscription
            </Button>
          </div>

          {licenseesToDisplay.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du licencié</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Montant dû</TableHead>
                  <TableHead>Statut du paiement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenseesToDisplay.map((licensee) => (
                  <TableRow key={licensee.id}>
                    <TableCell className="font-medium">{`${licensee.firstName} ${licensee.lastName}`}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryName(licensee.licenseeCategoryId)}</Badge>
                    </TableCell>
                    <TableCell>{`${getPack(licensee.packId)?.price ?? 0} €`}</TableCell>
                    <TableCell>
                      <Badge variant={licensee.paymentStatus === 'En attente' ? "destructive" : "secondary"}>
                        {licensee.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button onClick={() => handleManageClick(licensee)}>Gérer le paiement</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Aucun paiement en attente correspondant à vos filtres.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isManageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Paiement pour : {selectedLicensee?.firstName} {selectedLicensee?.lastName}</DialogTitle>
            {currentPack && (
                <DialogDescription>
                    Pack : {currentPack.name} - {currentPack.price}€
                </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="space-y-6 py-2">
            <div>
                <Label className="text-base font-semibold">Options de paiement</Label>
                <div className="space-y-3 mt-2">
                    {(reductions || []).map(option => (
                        <div key={option.id} className="flex flex-col">
                            <div className="flex items-start space-x-2">
                                <Checkbox 
                                    id={option.id}
                                    className="mt-0.5"
                                    checked={isReductionApplied(option.id)}
                                    onCheckedChange={(checked) => {
                                        setPaymentData(prev => {
                                            const currentReductions = prev.reductions || [];
                                            const newReductions = checked 
                                                ? [...currentReductions, { id: option.id, note: '' }]
                                                : currentReductions.filter(r => r.id !== option.id);
                                            return { ...prev, reductions: newReductions };
                                        })
                                    }}
                                />
                                <div className="grid gap-0 leading-tight">
                                    <Label htmlFor={option.id} className="font-normal cursor-pointer">
                                        {`${option.name} ${getReductionEffectDisplay(option)}`}
                                    </Label>
                                    {option.note && (
                                        <p className="text-xs text-muted-foreground">{option.note}</p>
                                    )}
                                </div>
                            </div>
                            {isReductionApplied(option.id) && (
                                <Input
                                    className="mt-2 ml-6 h-8"
                                    placeholder="Ajouter une note (ex: N° du pass)..."
                                    value={(paymentData.reductions.find(r => r.id === option.id)?.note) || ''}
                                    onChange={(e) => {
                                        setPaymentData(prev => {
                                            const newReductions = (prev.reductions || []).map(r => 
                                                r.id === option.id ? { ...r, note: e.target.value } : r
                                            );
                                            return { ...prev, reductions: newReductions };
                                        });
                                    }}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <Separator />
            
            <div>
                <Label className="text-base font-semibold">Détail du Réglement</Label>
                <div className="space-y-4 mt-3">
                    <div className="space-y-2">
                        <Label>Statut du paiement</Label>
                        <RadioGroup 
                            value={paymentData.paymentStatus} 
                            onValueChange={(value) => setPaymentData(prev => ({ ...prev, paymentStatus: value as Licensee['paymentStatus'] }))}
                            className="flex items-center gap-4"
                        >
                            <div className="flex items-center space-x-2"><RadioGroupItem value="En attente" id="r1" /><Label htmlFor="r1" className="font-normal cursor-pointer">En attente</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="Partiel" id="r2" /><Label htmlFor="r2" className="font-normal cursor-pointer">Partiel</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="Payé" id="r3" /><Label htmlFor="r3" className="font-normal cursor-pointer">Payé</Label></div>
                        </RadioGroup>
                    </div>

                    {paymentData.paymentStatus === 'Partiel' && (
                        <div className="space-y-2">
                            <Label htmlFor="amount-paid">Montant payé (€)</Label>
                            <Input
                                id="amount-paid"
                                type="number"
                                value={paymentData.amountPaid || ''}
                                onChange={(e) => setPaymentData(prev => ({...prev, amountPaid: Number(e.target.value)}))}
                                placeholder="ex: 50"
                            />
                        </div>
                    )}


                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="payment-method">Méthode de paiement</Label>
                             <Select 
                                value={paymentData.paymentMethod} 
                                onValueChange={(value) => setPaymentData(prev => ({...prev, paymentMethod: value as PaymentMethod}))}
                            >
                                <SelectTrigger id="payment-method">
                                    <SelectValue placeholder="Choisir..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label>Date du paiement</Label>
                            <Popover open={isPaymentDateOpen} onOpenChange={setPaymentDateOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !paymentData.paymentDate && "text-muted-foreground" )}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {paymentData.paymentDate ? format(paymentData.paymentDate, "PPP", { locale: fr }) : <span>Choisissez une date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        locale={fr}
                                        mode="single"
                                        selected={paymentData.paymentDate}
                                        onSelect={(date) => {
                                            setPaymentData(prev => ({...prev, paymentDate: date}));
                                            setPaymentDateOpen(false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="comment">Commentaire</Label>
                        <Textarea 
                            id="comment" 
                            placeholder="Ajouter une note..."
                            value={paymentData.paymentComment}
                            onChange={(e) => setPaymentData(prev => ({...prev, paymentComment: e.target.value}))}
                        />
                    </div>
                </div>
            </div>
          </div>

          <DialogFooter className="pt-6 sm:flex sm:justify-between sm:items-end">
            <div className="text-left mb-4 sm:mb-0">
                <Label className="text-xs text-muted-foreground">Reste à payer</Label>
                <p className="text-2xl font-bold">{remainingAmount.toFixed(2)} €</p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:gap-2">
                <Button variant="outline" onClick={() => setManageDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleSaveChanges}>Sauvegarder</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>Nouvelle inscription</DialogTitle>
                <DialogDescription>Remplissez les informations pour créer un nouveau licencié.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <ScrollArea className="max-h-[65vh] pr-4">
                    <form id="add-licensee-form" onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
                        <div className="space-y-8 pr-2">
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
                                                    value={field.value}
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
                                            <Popover open={isNewDobOpen} onOpenChange={setNewDobOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
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
                                                            setNewDobOpen(false);
                                                        }}
                                                        disabled={(date) => date > new Date() || date < new Date("1920-01-01")}
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
                                                <FormLabel className="cursor-pointer">Né(e) à l'étranger</FormLabel>
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
                                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>La catégorie est calculée depuis la date de naissance et le sexe.</FormDescription>
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
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Choisissez un pack" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {packs.map((pack) => (
                                                        <SelectItem key={pack.id} value={pack.id}>{`${pack.name} - ${pack.price}€`}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                  {isMinor && (
                                      <>
                                          <div className="col-span-1 md:col-span-2 mt-6 mb-2"> <h3 className="text-xl font-semibold border-b pb-2">Responsable Légal</h3> </div>
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
                                                      <Popover open={isNewRepDobOpen} onOpenChange={setNewRepDobOpen}>
                                                          <PopoverTrigger asChild>
                                                              <FormControl>
                                                                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
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
                                                                      setNewRepDobOpen(false);
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
                                                          <FormLabel className="cursor-pointer">Né(e) à l'étranger</FormLabel>
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
                        </div>
                    </form>
                </ScrollArea>
                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Annuler</Button>
                    <Button type="submit" form="add-licensee-form">Enregistrer</Button>
                </DialogFooter>
            </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
