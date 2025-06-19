
'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, type UseFormReturn } from 'react-hook-form';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { DatePickerField } from '@/components/inscription/add-licencie-modal'; // Réutilisation du DatePickerField
import type { LicencieItem, PaiementDetails } from '@/app/inscription/nouveau-licencie/page';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';


const paiementFormSchema = z.object({
  licenceAvecDon: z.boolean().optional(),
  enfantEducateur: z.boolean().optional(),
  reductionFratrie: z.boolean().optional(),
  nombreEnfantsFratrie: z.coerce.number().int().min(0, "Nombre d'enfants positif requis.").optional(),
  passSport: z.boolean().optional(),
  codePassSport: z.string().optional(),
  carteVillemoustoussou: z.boolean().optional(),
  codeCarteVillemoustoussou: z.string().optional(),
  
  statutPaiement: z.enum(['En attente', 'Partiel', 'Payé', 'Non payé']),
  montantPayePartiel: z.coerce.number().min(0, "Montant positif requis.").optional(),
  methodePaiement: z.enum(['CB', 'Chèque', 'Espèces', 'Virement', 'Autre']).optional(),
  autreMethodePaiement: z.string().optional(),
  datePaiement: z.date().optional().nullable(),
  commentaires: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.reductionFratrie && (data.nombreEnfantsFratrie === undefined || data.nombreEnfantsFratrie <= 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nombre d'enfants requis.", path: ['nombreEnfantsFratrie'] });
  }
  if (data.passSport && (!data.codePassSport || data.codePassSport.trim() === '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Code Pass Sport requis.", path: ['codePassSport'] });
  }
  if (data.carteVillemoustoussou && (!data.codeCarteVillemoustoussou || data.codeCarteVillemoustoussou.trim() === '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Code Carte Villemoustoussou requis.", path: ['codeCarteVillemoustoussou'] });
  }
  if (data.statutPaiement === 'Partiel' && (data.montantPayePartiel === undefined || data.montantPayePartiel <= 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Montant partiel requis.", path: ['montantPayePartiel'] });
  }
  if (data.methodePaiement === 'Autre' && (!data.autreMethodePaiement || data.autreMethodePaiement.trim() === '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Précisez l'autre méthode de paiement.", path: ['autreMethodePaiement'] });
  }
});

export type PaiementFormData = z.infer<typeof paiementFormSchema>;

interface PaiementModalProps {
  isOpen: boolean;
  onClose: () => void;
  licencie: LicencieItem;
  onSave: (licencieId: string, data: PaiementFormData, montantTotalCalcule: number) => void;
}

const parseMontantPack = (packString: string): number => {
  const match = packString.match(/(\d+)€/);
  return match ? parseInt(match[1], 10) : 0;
};

export function PaiementModal({ isOpen, onClose, licencie, onSave }: PaiementModalProps) {
  const form = useForm<PaiementFormData>({
    resolver: zodResolver(paiementFormSchema),
    defaultValues: {
      licenceAvecDon: false,
      enfantEducateur: false,
      reductionFratrie: false,
      nombreEnfantsFratrie: 0,
      passSport: false,
      codePassSport: '',
      carteVillemoustoussou: false,
      codeCarteVillemoustoussou: '',
      statutPaiement: 'En attente',
      montantPayePartiel: 0,
      methodePaiement: undefined,
      autreMethodePaiement: '',
      datePaiement: new Date(),
      commentaires: '',
    },
  });

  const [montantPackInitial, setMontantPackInitial] = useState(0);
  const [montantCalculeApresReductions, setMontantCalculeApresReductions] = useState(0);
  const [montantAfficheEnBas, setMontantAfficheEnBas] = useState(0);


  const watchedFields = form.watch();

  useEffect(() => {
    if (licencie && isOpen) {
      const initialAmount = parseMontantPack(licencie.packChoisi);
      setMontantPackInitial(initialAmount);
      
      if (licencie.paiement) {
        form.reset({
          ...licencie.paiement,
          datePaiement: licencie.paiement.datePaiement || new Date(),
        });
      } else {
        form.reset({
          licenceAvecDon: false,
          enfantEducateur: false,
          reductionFratrie: false,
          nombreEnfantsFratrie: 0,
          passSport: false,
          codePassSport: '',
          carteVillemoustoussou: false,
          codeCarteVillemoustoussou: '',
          statutPaiement: 'En attente',
          montantPayePartiel: 0,
          methodePaiement: undefined,
          autreMethodePaiement: '',
          datePaiement: new Date(),
          commentaires: '',
        });
      }
    }
  }, [licencie, form, isOpen]);


  const calculateAndDisplayTotalDue = useCallback(() => {
    let currentTotal = montantPackInitial;

    if (watchedFields.licenceAvecDon) {
      currentTotal = montantPackInitial * 2;
    } else {
      if (watchedFields.enfantEducateur) {
        currentTotal -= montantPackInitial * 0.5;
      }
      if (watchedFields.reductionFratrie && watchedFields.nombreEnfantsFratrie && watchedFields.nombreEnfantsFratrie > 0) {
        currentTotal -= watchedFields.nombreEnfantsFratrie * 10;
      }
      if (watchedFields.passSport) {
        currentTotal -= 50;
      }
      if (watchedFields.carteVillemoustoussou) {
        currentTotal -= 60;
      }
    }
    const calculatedTotalAfterReductions = Math.max(0, currentTotal);
    setMontantCalculeApresReductions(calculatedTotalAfterReductions);

    let displayAmount = calculatedTotalAfterReductions;
    if (watchedFields.statutPaiement === 'Payé') {
      displayAmount = 0;
    } else if (watchedFields.statutPaiement === 'Partiel' && watchedFields.montantPayePartiel && watchedFields.montantPayePartiel > 0) {
      displayAmount = Math.max(0, calculatedTotalAfterReductions - watchedFields.montantPayePartiel);
    }
    setMontantAfficheEnBas(displayAmount);

  }, [montantPackInitial, watchedFields]);

  useEffect(() => {
    calculateAndDisplayTotalDue();
  }, [calculateAndDisplayTotalDue]);


  const onSubmit = (data: PaiementFormData) => {
    // montantCalculeApresReductions est le montant de la "dette" avant paiements.
    onSave(licencie.id, data, montantCalculeApresReductions);
    onClose();
  };
  
  const isLicenceAvecDonChecked = form.watch('licenceAvecDon');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Paiement pour {licencie.prenom} {licencie.nom}</DialogTitle>
          <DialogDescription>
            Pack choisi: <span className="font-semibold">{licencie.packChoisi}</span> (Montant initial: {montantPackInitial}€)
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2 pr-4 pl-1 custom-scrollbar"> {/* Scrollable area */}
          <Form {...form}>
            <form className="space-y-6"> {/* Removed onSubmit here, will be on DialogFooter button */}
              <div className="space-y-4">
                <h3 className="text-md font-semibold">Options de Paiement</h3>
                <FormField
                  control={form.control}
                  name="licenceAvecDon"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="font-normal">Licence avec don (Montant du pack x2)</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enfantEducateur"
                  render={({ field }) => (
                    <FormItem className={cn("flex flex-row items-center space-x-3 space-y-0", isLicenceAvecDonChecked && "opacity-50 cursor-not-allowed")}>
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLicenceAvecDonChecked} /></FormControl>
                      <FormLabel className={cn("font-normal", isLicenceAvecDonChecked && "text-muted-foreground")}>Enfant éducateur (50% sur le pack)</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reductionFratrie"
                  render={({ field }) => (
                    <FormItem className={cn("flex flex-row items-center space-x-3 space-y-0", isLicenceAvecDonChecked && "opacity-50 cursor-not-allowed")}>
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLicenceAvecDonChecked} /></FormControl>
                      <FormLabel className={cn("font-normal", isLicenceAvecDonChecked && "text-muted-foreground")}>Réduction Fratrie (-10€ / enfant)</FormLabel>
                    </FormItem>
                  )}
                />
                {form.watch('reductionFratrie') && !isLicenceAvecDonChecked && (
                  <FormField
                    control={form.control}
                    name="nombreEnfantsFratrie"
                    render={({ field }) => (
                      <FormItem className="pl-8">
                        <FormLabel>Nombre d'enfants concernés</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="passSport"
                  render={({ field }) => (
                    <FormItem className={cn("flex flex-row items-center space-x-3 space-y-0", isLicenceAvecDonChecked && "opacity-50 cursor-not-allowed")}>
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLicenceAvecDonChecked} /></FormControl>
                      <FormLabel className={cn("font-normal", isLicenceAvecDonChecked && "text-muted-foreground")}>Pass Sport (-50€)</FormLabel>
                    </FormItem>
                  )}
                />
                {form.watch('passSport') && !isLicenceAvecDonChecked && (
                  <FormField
                    control={form.control}
                    name="codePassSport"
                    render={({ field }) => (
                      <FormItem className="pl-8">
                        <FormLabel>Code Pass Sport</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="carteVillemoustoussou"
                  render={({ field }) => (
                    <FormItem className={cn("flex flex-row items-center space-x-3 space-y-0", isLicenceAvecDonChecked && "opacity-50 cursor-not-allowed")}>
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLicenceAvecDonChecked} /></FormControl>
                      <FormLabel className={cn("font-normal", isLicenceAvecDonChecked && "text-muted-foreground")}>Carte Villemoustoussou (-60€)</FormLabel>
                    </FormItem>
                  )}
                />
                {form.watch('carteVillemoustoussou') && !isLicenceAvecDonChecked && (
                  <FormField
                    control={form.control}
                    name="codeCarteVillemoustoussou"
                    render={({ field }) => (
                      <FormItem className="pl-8">
                        <FormLabel>Code Carte Villemoustoussou</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-md font-semibold">Détail du Règlement</h3>
                <FormField
                  control={form.control}
                  name="statutPaiement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut du paiement</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un statut" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="En attente">En attente</SelectItem>
                          <SelectItem value="Partiel">Partiel</SelectItem>
                          <SelectItem value="Payé">Payé</SelectItem>
                          <SelectItem value="Non payé">Non payé</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch('statutPaiement') === 'Partiel' && (
                  <FormField
                    control={form.control}
                    name="montantPayePartiel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant payé (si partiel)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="methodePaiement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Méthode de paiement</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une méthode" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="CB">CB</SelectItem>
                          <SelectItem value="Chèque">Chèque</SelectItem>
                          <SelectItem value="Espèces">Espèces</SelectItem>
                          <SelectItem value="Virement">Virement</SelectItem>
                          <SelectItem value="Autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch('methodePaiement') === 'Autre' && (
                  <FormField
                    control={form.control}
                    name="autreMethodePaiement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Préciser autre méthode</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <Controller
                    control={form.control}
                    name="datePaiement"
                    render={({ field: controllerField }) => (
                        <DatePickerField
                        field={{
                            ...controllerField,
                            value: controllerField.value || null,
                            onChange: (date: Date | null) => controllerField.onChange(date),
                        }}
                        label="Date de paiement"
                        form={form as any} 
                        name="datePaiement"
                        disabledFuture={false} 
                        />
                    )}
                />
                <FormField
                  control={form.control}
                  name="commentaires"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commentaires</FormLabel>
                      <FormControl><Textarea {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>
        <DialogFooter className="pt-4 border-t mt-auto"> {/* Footer outside scrollable area */}
          <div className="flex justify-between items-center w-full">
            <p className="text-lg font-semibold">Montant total dû: {montantAfficheEnBas.toFixed(2)}€</p>
            <div>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose} className="mr-2">
                  Annuler
                </Button>
              </DialogClose>
              <Button type="button" onClick={form.handleSubmit(onSubmit)}>Enregistrer</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    