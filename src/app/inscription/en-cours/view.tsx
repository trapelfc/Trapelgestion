
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MoreHorizontal, Pencil, Trash2, CalendarIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Licensee, LicenseeCategory, Pack } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { deleteLicensee, updateLicensee } from "@/lib/actions";

interface InscriptionEnCoursViewProps {
  licensees: Licensee[];
  licenseeCategories: LicenseeCategory[];
  packs: Pack[];
}

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="text-base break-words">{value || 'N/A'}</div>
    </div>
);

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


export function InscriptionEnCoursView({
  licensees,
  licenseeCategories,
  packs,
}: InscriptionEnCoursViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isProfileOpen, setProfileOpen] = React.useState(false);
  const [isAlertOpen, setAlertOpen] = React.useState(false);
  const [selectedLicensee, setSelectedLicensee] = React.useState<Licensee | null>(null);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [isEditDobOpen, setEditDobOpen] = React.useState(false);
  const [isEditRepDobOpen, setEditRepDobOpen] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema)
  });

  const licenseesToDisplay = licensees.filter(
    (lic) => !(lic.paymentStatus === 'Payé' && lic.equipmentStatus === 'Attribué')
  );

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

  React.useEffect(() => {
    if (isEditMode && selectedLicensee) {
      form.reset({
        ...selectedLicensee,
        dateOfBirth: new Date(selectedLicensee.dateOfBirth),
        placeOfBirth: selectedLicensee.placeOfBirth || '',
        legalRepresentative: selectedLicensee.legalRepresentative
          ? {
              ...selectedLicensee.legalRepresentative,
              dateOfBirth: new Date(selectedLicensee.legalRepresentative.dateOfBirth),
            }
          : {
              lastName: "", firstName: "", placeOfBirth: "", bornAbroad: false,
              email: "", fatherPhone: "", motherPhone: "",
            },
      });
    }
  }, [isEditMode, selectedLicensee, form]);

  const handleOpenProfile = (licensee: Licensee, startInEditMode = false) => {
    setSelectedLicensee(licensee);
    setIsEditMode(startInEditMode);
    setProfileOpen(true);
  };

  const handleDeleteClick = (licensee: Licensee) => {
    setSelectedLicensee(licensee);
    setAlertOpen(true);
  }

  const handleConfirmDelete = async () => {
    if (selectedLicensee) {
      await deleteLicensee(selectedLicensee.id);
      toast({
        title: "Inscription supprimée",
        description: `L'inscription de ${selectedLicensee.firstName} ${selectedLicensee.lastName} a été supprimée.`,
        variant: "destructive",
      });
      setAlertOpen(false);
      setSelectedLicensee(null);
      router.refresh();
    }
  };

  async function onSubmit(values: FormValues) {
    if (!selectedLicensee) return;
    try {
      await updateLicensee(selectedLicensee.id, values);
      toast({
        title: "Profil mis à jour",
        description: `Les informations de ${values.firstName} ${values.lastName} ont été sauvegardées.`,
      });
      setIsEditMode(false);
      setProfileOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        title: "Erreur de mise à jour",
        description: "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  }

  const getCategoryName = (id: string) => {
    return licenseeCategories.find((cat) => cat.id === id)?.name ?? "N/A";
  };

  const getPackInfo = (id: string) => {
    const pack = packs.find((p) => p.id === id);
    return pack ? `${pack.name} - ${pack.price}€` : "N/A";
  };

  const getStatusBadge = (status: Licensee['paymentStatus'] | Licensee['equipmentStatus']) => {
    switch (status) {
        case 'En attente':
            return <Badge variant="destructive">En attente</Badge>;
        case 'Payé':
        case 'Attribué':
            return <Badge style={{ backgroundColor: 'hsl(var(--chart-2))', color: 'hsl(var(--primary-foreground))' }}>Terminé</Badge>;
        case 'Partiel':
            return <Badge variant="outline">Partiel</Badge>;
        case 'Incomplet':
            return <Badge style={{ backgroundColor: 'hsl(var(--chart-4))', color: 'hsl(var(--card-foreground))' }}>Incomplet</Badge>;
        default:
            return <Badge variant="outline">N/A</Badge>;
    }
  }

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Inscriptions en cours</CardTitle>
          <CardDescription>
            Consultez et gérez la liste des inscriptions en attente de finalisation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {licenseesToDisplay.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du licencié</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Pack souscrit</TableHead>
                  <TableHead>Date d'inscription</TableHead>
                  <TableHead>Statut Paiement</TableHead>
                  <TableHead>Statut Équipement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenseesToDisplay.map((licensee) => (
                  <TableRow key={licensee.id}>
                    <TableCell>
                      <div className="font-medium">{`${licensee.firstName} ${licensee.lastName}`}</div>
                      <div className="text-sm text-muted-foreground">{licensee.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryName(licensee.licenseeCategoryId)}</Badge>
                    </TableCell>
                    <TableCell>{getPackInfo(licensee.packId)}</TableCell>
                    <TableCell>
                      {format(new Date(licensee.registrationDate), "d MMMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(licensee.paymentStatus)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(licensee.equipmentStatus)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Ouvrir le menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenProfile(licensee)}>
                            Voir le profil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenProfile(licensee, true)}>
                            <Pencil className="mr-2 h-4 w-4" /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                            onClick={() => handleDeleteClick(licensee)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Aucune inscription en cours pour le moment.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isProfileOpen} onOpenChange={(open) => { if (!open) setIsEditMode(false); setProfileOpen(open); }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Modifier le profil de" : "Profil de"} {selectedLicensee?.firstName} {selectedLicensee?.lastName}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Modifiez les informations ci-dessous." : `Détails de l'inscription enregistrée le ${selectedLicensee ? format(new Date(selectedLicensee.registrationDate), "d MMMM yyyy", { locale: fr }) : ''}.`}
            </DialogDescription>
          </DialogHeader>
          
          {isEditMode && selectedLicensee ? (
            <Form {...form}>
              <form id="edit-licensee-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-4">
                <ScrollArea className="max-h-[60vh] pr-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pr-1">
                      <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="sex" render={({ field }) => (<FormItem><FormLabel>Sexe</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="male" /></FormControl><FormLabel className="font-normal cursor-pointer">Homme</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="female" /></FormControl><FormLabel className="font-normal cursor-pointer">Femme</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="dateOfBirth" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date de naissance</FormLabel><Popover open={isEditDobOpen} onOpenChange={setEditDobOpen}><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal",!field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisissez une date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar locale={fr} mode="single" selected={field.value} onSelect={(d) => {field.onChange(d); setEditDobOpen(false);}} disabled={(date) => date > new Date() || date < new Date("1920-01-01")} captionLayout="dropdown-buttons" fromYear={1920} toYear={new Date().getFullYear()} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="placeOfBirth" render={({ field }) => (<FormItem><FormLabel>Lieu de naissance (facultatif)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="bornAbroad" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 h-10 mt-8"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel className="cursor-pointer">Né(e) à l'étranger</FormLabel></div></FormItem>)} />
                      <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Adresse e-mail</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="licenseeCategoryId" render={({ field }) => (<FormItem><FormLabel>Catégorie</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Catégorie assignée automatiquement..." /></SelectTrigger></FormControl><SelectContent>{licenseeCategories.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}</SelectContent></Select><FormDescription>La catégorie est calculée depuis la date de naissance et le sexe.</FormDescription><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="packId" render={({ field }) => (<FormItem><FormLabel>Pack</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisissez un pack" /></SelectTrigger></FormControl><SelectContent>{packs.map((pack) => (<SelectItem key={pack.id} value={pack.id}>{`${pack.name} - ${pack.price}€`}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />

                      {isMinor && (
                        <>
                          <div className="col-span-1 md:col-span-2 mt-6 mb-2"><h3 className="text-xl font-semibold border-b pb-2">Responsable Légal</h3></div>
                          <FormField control={form.control} name="legalRepresentative.firstName" render={({ field }) => (<FormItem><FormLabel>Prénom du responsable</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="legalRepresentative.lastName" render={({ field }) => (<FormItem><FormLabel>Nom du responsable</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="legalRepresentative.dateOfBirth" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date de naissance du responsable</FormLabel><Popover open={isEditRepDobOpen} onOpenChange={setEditRepDobOpen}><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisissez une date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar locale={fr} mode="single" selected={field.value} onSelect={(d) => {field.onChange(d); setEditRepDobOpen(false);}} disabled={(date) => date > new Date() || date < new Date("1930-01-01")} captionLayout="dropdown-buttons" fromYear={1930} toYear={new Date().getFullYear() - 18} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="legalRepresentative.placeOfBirth" render={({ field }) => (<FormItem><FormLabel>Lieu de naissance du responsable</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="legalRepresentative.bornAbroad" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 h-10 mt-8"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel className="cursor-pointer">Né(e) à l'étranger</FormLabel></div></FormItem>)} />
                          <FormField control={form.control} name="legalRepresentative.email" render={({ field }) => (<FormItem><FormLabel>Email du responsable</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="legalRepresentative.fatherPhone" render={({ field }) => (<FormItem><FormLabel>Téléphone Père</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="legalRepresentative.motherPhone" render={({ field }) => (<FormItem><FormLabel>Téléphone Mère</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </>
                      )}
                    </div>
                  </ScrollArea>
              </form>
            </Form>
          ) : (
            <ScrollArea className="max-h-[70vh] -mr-2 pr-6">
                <div className="space-y-6 py-4">
                    {selectedLicensee && <>
                        <div>
                            <h4 className="text-lg font-semibold mb-3">Informations du licencié</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <DetailItem label="Nom" value={selectedLicensee.lastName} />
                                <DetailItem label="Prénom" value={selectedLicensee.firstName} />
                                <DetailItem label="Sexe" value={selectedLicensee.sex === 'male' ? 'Homme' : 'Femme'} />
                                <DetailItem label="Date de naissance" value={format(new Date(selectedLicensee.dateOfBirth), "d MMMM yyyy", { locale: fr })} />
                                <DetailItem label="Lieu de naissance" value={selectedLicensee.placeOfBirth} />
                                <DetailItem label="Né(e) à l'étranger" value={selectedLicensee.bornAbroad ? 'Oui' : 'Non'} />
                                <DetailItem label="Téléphone" value={selectedLicensee.phone} />
                                <DetailItem label="Email" value={<span className="break-all">{selectedLicensee.email}</span>} />
                            </div>
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold mb-3">Détails de l'inscription</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <DetailItem label="Catégorie" value={getCategoryName(selectedLicensee.licenseeCategoryId)} />
                                <DetailItem label="Pack souscrit" value={getPackInfo(selectedLicensee.packId)} />
                                <DetailItem label="Statut Paiement" value={getStatusBadge(selectedLicensee.paymentStatus)} />
                                <DetailItem label="Statut Équipement" value={getStatusBadge(selectedLicensee.equipmentStatus)} />
                            </div>
                        </div>

                        {selectedLicensee.legalRepresentative && (
                            <div>
                                <Separator className="my-4" />
                                <h4 className="text-lg font-semibold mb-3">Responsable Légal</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <DetailItem label="Nom" value={selectedLicensee.legalRepresentative.lastName} />
                                    <DetailItem label="Prénom" value={selectedLicensee.legalRepresentative.firstName} />
                                    <DetailItem label="Date de naissance" value={selectedLicensee.legalRepresentative.dateOfBirth ? format(new Date(selectedLicensee.legalRepresentative.dateOfBirth), "d MMMM yyyy", { locale: fr }) : 'N/A'} />
                                    <DetailItem label="Lieu de naissance" value={selectedLicensee.legalRepresentative.placeOfBirth} />
                                    <DetailItem label="Né(e) à l'étranger" value={selectedLicensee.legalRepresentative.bornAbroad ? 'Oui' : 'Non'} />
                                    <DetailItem label="Email" value={<span className="break-all">{selectedLicensee.legalRepresentative.email}</span>} />
                                    <DetailItem label="Téléphone Père" value={selectedLicensee.legalRepresentative.fatherPhone} />
                                    <DetailItem label="Téléphone Mère" value={selectedLicensee.legalRepresentative.motherPhone} />
                                </div>
                            </div>
                        )}
                    </>}
                </div>
              </ScrollArea>
            )}
          
          <DialogFooter className="pr-6 pt-4">
            {isEditMode ? (
                <>
                    <Button variant="outline" onClick={() => setIsEditMode(false)}>Annuler</Button>
                    <Button type="submit" form="edit-licensee-form">Sauvegarder les modifications</Button>
                </>
            ) : (
                <>
                    <Button variant="outline" onClick={() => setProfileOpen(false)}>Fermer</Button>
                    <Button onClick={() => setIsEditMode(true)}>Modifier</Button>
                </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'inscription de {selectedLicensee?.firstName} {selectedLicensee?.lastName} sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
